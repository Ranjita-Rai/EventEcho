const { ipcRenderer } = require("electron");
// Listen for the calendar title update
ipcRenderer.on("update-calendar-title", (event, calendarName) => {
  document.getElementById("calendarTitle").innerText = calendarName;
});

// Listen for updated events from the main process
ipcRenderer.on("update-events", (event, events) => {
  renderEvents(events);
});

function renderEvents(events) {
  const tbody = document.querySelector("#events-table tbody");
  tbody.innerHTML = "";

  if (events.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align: center;">No events found.</td></tr>';
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to midnight of today
  const now = new Date(); // Current date and time

  const timingEvents = []; // Events happening today (ongoing or upcoming)
  const ongoingEvents = []; // Multi-day events that include today
  const todayStartEvents = []; // Events that start today but end in the future
  const upcomingEvents = []; // Future events
  const previousEvents = []; // Events that have already ended (including expired today)

  events.forEach(event => {
    const eventStart = new Date(event.start.dateTime || event.start.date);
    const eventEnd = new Date(event.end.dateTime || event.end.date);

    // Events that are fully inside today (both start and end on the same day)
    if (
      eventStart.toDateString() === today.toDateString() &&
      eventEnd.toDateString() === today.toDateString()
    ) {
      if (eventEnd < now) {
        previousEvents.push(event); // Expired today → move to previous
      } else {
        timingEvents.push(event); // Ongoing or upcoming today
      }
    } else if (eventStart <= today && eventEnd >= today) {
      // Ongoing events (multi-day events that include today)
      ongoingEvents.push(event); // Add to ongoing events
    } else if (
      eventStart.toDateString() === today.toDateString() &&
      eventEnd.toDateString() !== today.toDateString()
    ) {
      // Events that start today but end in the future
      todayStartEvents.push(event); // Event that starts today and ends in future
    } else if (eventStart > today) {
      // Future events
      upcomingEvents.push(event); // Future events
    } else if (eventEnd < today) {
      // Events fully ended before today
      previousEvents.push(event); // Fully ended events
    }
  });

  function formatDateTime(startDate, endDate, isMultiDay) {
    if (isMultiDay) {
      return [startDate.toLocaleDateString(), endDate.toLocaleDateString()];
    }
    return [startDate.toLocaleString(), endDate.toLocaleString()];
  }

  function appendEvents(eventsList, showTimeOnly = false) {
    eventsList.forEach(ev => {
      const row = document.createElement("tr");
      const startDate = new Date(ev.start.dateTime || ev.start.date);
      const endDate = new Date(ev.end.dateTime || ev.end.date);
      const isMultiDay = startDate.toDateString() !== endDate.toDateString();
      let startDateDisplay, endDateDisplay;

      if (showTimeOnly) {
        startDateDisplay = startDate.toLocaleTimeString();
        endDateDisplay = endDate.toLocaleTimeString();
      } else {
        [startDateDisplay, endDateDisplay] = formatDateTime(
          startDate,
          endDate,
          isMultiDay
        );
      }

      row.innerHTML = `
        <td>${ev.summary || " "}</td>
        <td>${ev.location || " "}</td>
        <td>${startDateDisplay}</td>
        <td>${endDateDisplay}</td>
        <td>${ev.description || " "}</td>
      `;
      tbody.appendChild(row);
    });
  }

  // Append events in the order you want to show them
  appendEvents(timingEvents, true); // Show time for today's events that haven't expired
  appendEvents(ongoingEvents); // Ongoing events
  appendEvents(todayStartEvents); // Events starting today

  if (
    (timingEvents.length > 0 ||
      ongoingEvents.length > 0 ||
      todayStartEvents.length > 0) &&
    upcomingEvents.length > 0
  ) {
    const separatorRow = document.createElement("tr");
    separatorRow.innerHTML = `
      <td colspan="5" style="text-align: center; background-color: #f0f0f0;">
        <b>Upcoming Events</b>
      </td>
    `;
    tbody.appendChild(separatorRow);
  }

  appendEvents(upcomingEvents); // Upcoming events
  appendEvents(previousEvents.reverse()); // Show the most recent previous events first
}

// By default, load today's events when the document is ready
document.addEventListener("DOMContentLoaded", () => {
  ipcRenderer.send("load-events", "upcoming"); // Request to load upcoming events
});

// When clicking the "Previous" button, request to fetch previous events
document.getElementById("previousBtn").addEventListener("click", () => {
  ipcRenderer.send("load-events", "previous");
  setActiveButton("previousBtn");
});

// When clicking the "Upcoming" button, request to fetch upcoming events
document.getElementById("upcomingBtn").addEventListener("click", () => {
  ipcRenderer.send("load-events", "upcoming");
  setActiveButton("upcomingBtn");
});
