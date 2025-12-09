async function loadRooms() {
  const container = document.getElementById("rooms-container");

  try {
    const response = await fetch("rooms.json");
    const rooms = await response.json();

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
  } catch (error) {
    container.innerHTML = "<p>Error loading rooms.</p>";
  }
}

loadRooms();
