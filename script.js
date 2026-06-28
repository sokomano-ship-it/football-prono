document.addEventListener("DOMContentLoaded", () => {
    init();
});

async function init() {

    document.getElementById("api-status").innerHTML = "Chargement API...";

    try {

        const pronostics = await loadPronostics();

        const matches = await loadWorldCupMatches();

        console.log("Matches API :", matches);

        const ranking = createEmptyRanking(pronostics);

        displayRanking(ranking);

        document.getElementById("api-status").innerHTML =
            `✅ API chargée - ${matches.length} matchs récupérés`;

    } catch (error) {

        console.error(error);

        document.getElementById("api-status").innerHTML =
            `❌ Erreur API : ${error.message}`;
    }
}

async function loadPronostics() {

    const res = await fetch("pronostics.json");

    if (!res.ok) {
        throw new Error("Impossible de charger pronostics.json");
    }

    return await res.json();
}

async function loadWorldCupMatches() {

    const apiUrl =
        "https://api.football-data.org/v4/competitions/WC/matches";

    const response = await fetch(
        "https://project-fs0bs.vercel.app/api?url=" +
        encodeURIComponent(apiUrl)
    );

    if (!response.ok) {
        throw new Error("Erreur backend Vercel");
    }

    const data = await response.json();

    console.log("DATA API:", data);

    return data.matches || [];
}

function createEmptyRanking(pronostics) {

    const ranking = {};

    Object.keys(pronostics).forEach(player => {
        ranking[player] = 0;
    });

    return ranking;
}

function displayRanking(ranking) {

    const tbody = document.querySelector("#ranking tbody");

    tbody.innerHTML = "";

    let position = 1;

    Object.entries(ranking)
        .sort((a, b) => b[1] - a[1])
        .forEach(([player, points]) => {

            tbody.innerHTML += `
                <tr>
                    <td>${position}</td>
                    <td>${player}</td>
                    <td>${points}</td>
                </tr>
            `;

            position++;
        });
}