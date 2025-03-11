process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = true; // Disable security warnings

// Toggle dark mode
function toggleDarkMode() {
  var body = document.body; // Get the body element
  var darkModeIcon = document.getElementById("darkmode-icon"); // Get the dark mode icon element
  body.classList.toggle("dark-mode"); // Toggle dark mode class on the body
  if (body.classList.contains("dark-mode")) {
    // Check if dark mode is enabled
    darkModeIcon.src = "lightmode-icon.png"; // Light mode icon
    darkModeIcon.alt = "Light Mode";
  } else {
    darkModeIcon.src = "darkmode-icon.png"; // Dark mode icon
    darkModeIcon.alt = "Dark Mode";
  }
}

// Close the dropdown menu if the user clicks outside of it
window.onclick = function(event) {
  // Listen for click events on the window
  if (!event.target.matches("#settings")) {
    // Check if the click target is not the settings button
    var dropdowns = document.getElementsByClassName("settingsMenu"); // Get all dropdown menu elements
    for (var i = 0; i < dropdowns.length; i++) {
      // Loop through each dropdown menu
      var openDropdown = dropdowns[i]; // Get the current dropdown menu
      if (openDropdown.style.display === "block") {
        // Check if the dropdown menu is visible
        openDropdown.style.display = "none"; // Hide it
      }
    }
  }
};

// Set active button with custom styling
function setActiveButton(activeButtonId) {
  var buttons = document.querySelectorAll(".Event-buttons button"); // Get all button elements with class "Event-buttons"
  buttons.forEach(function(button) {
    // Loop through each button
    button.classList.remove("active"); // Remove active class
    button.style.backgroundColor = ""; // Reset background color
  });
  document.getElementById(activeButtonId).classList.add("active"); // Add active class to the specified button
  document.getElementById(activeButtonId).style.backgroundColor = "#41d119"; // Set active button background color
}

// Get and display today's date
function getTodayDate() {
  var today = new Date(); // Get today's date
  var year = today.getFullYear(); // Get the year
  var month = (today.getMonth() + 1).toString().padStart(2, "0"); // Adds leading zero to month
  var day = today.getDate().toString().padStart(2, "0"); // Adds leading zero to day
  var date = year + "-" + month + "-" + day; // Format the date
  document.getElementById("TodayButton").innerHTML = date; // Display the date on the button
}

// Call to get today's date
getTodayDate();

// Function to handle the authorization process
function authorizeUser() {
  //Clear the calendar ID value
 const calendarIdInput = document.getElementById("calendarIdInput");
 if (calendarIdInput) {
   calendarIdInput.value = ""; // Reset calendar ID input to empty
 }  
 ipcRenderer.send("clear-calendar-id");
  ipcRenderer.send("authorize"); // Send authorization request to main process
}

// Handle authorization success
ipcRenderer.on("authorization-success", () => {
  // Hide the authorization UI and show the events UI
  document.getElementById("authorizationUI").style.display = "none";
  document.getElementById("eventsUI").style.display = "block";
  // Enable the "Previous" and "Upcoming" buttons
  document.getElementById("previousBtn").disabled = false;
  document.getElementById("upcomingBtn").disabled = false;
  setActiveButton("upcomingBtn"); // Upcoming button as active
  ipcRenderer.send("fetch-default-calendar-events");
  fetchEvents();
});

// Function to handle login redirect
function loginUser() {
  ipcRenderer.send("authorize"); // Redirects to browser for authorization
}

// Function to toggle Calendar ID input field inside the settings menu
function toggleCalendarInput() {
  var calendarContainer = document.getElementById("calendarInputContainer");
  if (calendarContainer.style.display === "block") {
    calendarContainer.style.display = "none"; // Hide the input field
  } else {
    calendarContainer.style.display = "block"; // Show the input field
  }
}
function setCalendarId() {
  const calendarId = document.getElementById("calendarIdInput").value.trim();
  if (calendarId) {
    ipcRenderer.send("set-calendar-id", calendarId); // Send Calendar ID to main process
    alert(`Calendar ID set: ${calendarId}`);
  } else {
    alert("Please enter a valid Calendar ID");
  }
}
 // Function to handle logout and redirect to the authorization browser
function logoutUser() {
  document.getElementById("authorizationUI").style =
    "display: block; text-align: center; margin-top: 20px;"; // Center the authorization UI
  document.getElementById("eventsUI").style.display = "block"; // show events UI
  document.getElementById("events").style.display = "block"; // show events table
  document.getElementsByTagName("tbody")[0].innerHTML = ""; // Clear events table
  document.getElementById("calendarTitle").innerText = "Calendar Events"; // Reset calendar title
  document.getElementById("previousBtn").disabled = true;
  document.getElementById("upcomingBtn").disabled = true;
 // Clear the calendar ID value
 const calendarIdInput = document.getElementById("calendarIdInput");
 if (calendarIdInput) {
   calendarIdInput.value = ""; // Reset calendar ID input to empty
 }  
 ipcRenderer.send("clear-calendar-id");
 setActiveButton(null); // Reset active button
}