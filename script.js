let roomsData = [];

async function loadRooms() {
  const container = document.getElementById("rooms-container");
  const teamFilter = document.getElementById("teamFilter");

  try {
    const response = await fetch("rooms.json");
    roomsData = await response.json();

    // Populate team dropdown
    const teams = [...new Set(roomsData.map(r => r.team))];
    teams.forEach(team => {
      const option = document.createElement("option");
      option.value = team;
      option.textContent = team;
      teamFilter.appendChild(option);
    });

    renderRooms(roomsData);
  } catch (err) {
    container.innerHTML = "<p>Error loading rooms</p>";
  }
}

function renderRooms(rooms) {
  const container = document.getElementById("rooms-container");
  container.innerHTML = "";

  rooms.forEach(room => {
    const card = document.createElement("div");
    card.className = "room-card";

    card.innerHTML = `
      <h2>${room.team}</h2>
      <p><strong>Location:</strong> ${room.location}</p>
      <p><strong>Notes:</strong> ${room.notes}</p>
    `;

    container.appendChild(card);
  });

  if (rooms.length === 0) {
    container.innerHTML = "<p>No rooms match your search.</p>";
  }
}

function applyFilters() {
  const searchText = document.getElementById("searchInput").value.toLowerCase();
  const teamValue = document.getElementById("teamFilter").value;

  const filtered = roomsData.filter(room => {
    const matchesText =
      room.team.toLowerCase().includes(searchText) ||
      room.location.toLowerCase().includes(searchText) ||
      room.notes.toLowerCase().includes(searchText);

    const matchesTeam = teamValue === "" || room.team === teamValue;

    return matchesText && matchesTeam;
  });

  renderRooms(filtered);
}

// Event listeners
document.getElementById("searchInput").addEventListener("input", applyFilters);
document.getElementById("teamFilter").addEventListener("change", applyFilters);

loadRooms();

