const { app, BrowserWindow, ipcMain, shell } = require("electron"); // Import the app module from Electron
const path = require("path"); // Import the path module from Node.js
const { google } = require("googleapis"); // Import the googleapis module from google-auth-library
const credentials = require("./credentials.json"); // Import the credentials.json file
const http = require("http"); // Import the http module from Node.js
const url = require("url"); // Import the url module from Node.js
const portfinder = require("portfinder"); // Import the portfinder module
const fs = require("fs"); // Import the fs module from Node.js
let oAuth2Client; // Declare oAuth2Client variable
let mainWindow; // Declare mainWindow variable
let localServer; // Declare localServer variable
let tokenData = null; // Declare tokenData variable

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]; // Declare SCOPES variable
const TOKEN_PATH = path.join(__dirname, "token.json"); // Declare TOKEN_PATH variable

function createWindow() {
  // Define createWindow function
  mainWindow = new BrowserWindow({
    // Create a new BrowserWindow instance
    width: 1920,
    height: 1080,
    icon: path.join(__dirname, "assets", "icon.ico"), // Set the icon for the window
    webPreferences: {
      // Set the webPreferences for the window
      nodeIntegration: true, // Enable nodeIntegration
      contextIsolation: false // Disable contextIsolation
    }
  });
  mainWindow.setMenu(null); // Hide the menu bar

  mainWindow.loadFile(path.join(__dirname, "public", "index.html")); // Load the index.html file

  mainWindow.on("closed", () => {
    // Listen for the closed event
    mainWindow = null;
  });
}

let currentCalendarId = "primary"; // Default Calendar ID
function fetchEvents(type) {
  const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

  // Fetch the calendar name dynamically
  calendar.calendars.get({ calendarId: currentCalendarId }, (err, res) => {
    if (err) {
      console.error("Error fetching calendar name:", err);
      return;
    }

    const calendarName = res.data.summary;

    if (mainWindow) {
      mainWindow.webContents.send("update-calendar-title", calendarName);
    }
  });

  // Fetch events from the calendar
  calendar.events.list(
    {
      calendarId: currentCalendarId,
      maxResults: 500,
      singleEvents: true,
      orderBy: "startTime"
    },
    (err, res) => {
      if (err) {
        console.error("The API returned an error:", err);
        if (mainWindow) {
          mainWindow.webContents.send(
            "fetch-events-error",
            "Failed to fetch events. Please try again."
          );
        }
        return;
      }

      const events = res.data.items;
      const currentTime = new Date();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0); // Start of the day
      const endOfToday = new Date(startOfToday);
      endOfToday.setHours(23, 59, 59, 999); // End of the day

      let filteredEvents = [];

      if (type === "upcoming") {
        // Upcoming events: events that are ongoing or start after the current time
        filteredEvents = events.filter(event => {
          const eventEndTime = getEventEndTime(event);
          return eventEndTime >= currentTime; // Events that are ongoing or upcoming
        });
      } else if (type === "today") {
        // Today's events: events that occurred today (even if they have ended)
        filteredEvents = events.filter(event => {
          const eventStartTime = getEventTime(event);
          const eventEndTime = getEventEndTime(event);
          return (
            (eventStartTime >= startOfToday && eventStartTime < endOfToday) || // Starts today
            (eventStartTime < startOfToday && eventEndTime >= startOfToday) // Started before today but ended today
          );
        });
      } else if (type === "previous") {
        // Previous events: events that ended before the current time
        filteredEvents = events.filter(event => {
          const eventEndTime = getEventEndTime(event);
          return eventEndTime < currentTime; // Events that ended before now
        });
      }

      console.log(`${type} events:`, filteredEvents);

      if (mainWindow) {
        mainWindow.webContents.send("update-events", filteredEvents);
      }
    }
  );
}
// Function to determine event start time
function getEventTime(event) {
  let eventTime;
  if (event.start.dateTime) {
    eventTime = new Date(event.start.dateTime);
  } else if (event.start.date) {
    eventTime = new Date(event.start.date);
    eventTime.setHours(0, 0, 0, 0);
  }
  return eventTime;
}

// Function to determine event end time
function getEventEndTime(event) {
  let eventEndTime;
  if (event.end.dateTime) {
    eventEndTime = new Date(event.end.dateTime);
  } else if (event.end.date) {
    eventEndTime = new Date(event.end.date);
    eventEndTime.setHours(23, 59, 59, 999); // End of the day
  }
  return eventEndTime;
}

// IPC Listener to update calendar ID
ipcMain.on("set-calendar-id", (event, calendarId) => {
  currentCalendarId = calendarId || "primary"; // Use provided ID, fallback to 'primary'
  console.log("Calendar ID updated to:", currentCalendarId);
});

ipcMain.on("clear-calendar-id", (event) => {
  currentCalendarId = "primary"; // Reset to default Calendar ID
  console.log("Calendar ID reset to default:", currentCalendarId);
});

ipcMain.on("fetch-default-calendar-events", (event) => {
  fetchEvents("upcoming"); // Fetch upcoming events for the default Calendar ID
});

async function authorize() {
  const { client_secret, client_id, redirect_uris } = credentials.installed; // Use desktop client credentials
  const dynamicPort = await portfinder.getPortPromise(); // Find an available port dynamically
  const redirectUri = `http://localhost:${dynamicPort}/auth/callback`; // Set the redirect URI

  oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri); // Create a new OAuth2 client

  const authUrl = oAuth2Client.generateAuthUrl({
    // Generate the authorization URL
    access_type: "offline", // Request offline access
    scope: SCOPES // Set the scope
  });

  shell.openExternal(authUrl); // Open the authorization URL in the default browser

  startLocalServer(dynamicPort); // Start the local server
}

function startLocalServer(port) {
  // Start the local server
  localServer = http.createServer((req, res) => {
    // Create a new HTTP server
    const parsedUrl = url.parse(req.url, true); // Parse the request URL
    console.log("Received request:", parsedUrl); // Log the request

    if (parsedUrl.pathname === "/auth/callback") {
      // Check if the pathname is /auth/callback
      const code = parsedUrl.query.code; // Get the authorization code

      if (code) {
        // Check if the code is not empty
        oAuth2Client.getToken(code, (err, token) => {
          // Get the token using the code
          if (err) {
            // Handle error
            console.error("Error retrieving access token:", err);
            res.end("Error retrieving access token.");
            return;
          }

          oAuth2Client.setCredentials(token); // Set the credentials
          tokenData = token; // Store the token data

          fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
            // Write the token to a file
            if (err) {
              console.error("Error storing token:", err);
            } else {
              // Handle success
              console.log("Token stored to", TOKEN_PATH);
            }
          });

          fetchEvents("upcoming"); // Fetch upcoming events

          mainWindow.webContents.send("authorization-success");
          res.end("Authorization successful! You can close this window."); // End the response
        });
      } else {
        res.end("Error: Missing authorization code."); // End the response
      }
    } else {
      res.end("Invalid request. Please check your OAuth2 callback URL."); // End the response
    }
  });

  localServer.listen(port, () => {
    // Listen on the specified port
    console.log(`Local server listening on port ${port}`); // Log the port
  });
}

function loadStoredToken() {
  // Load the stored token
  try {
    // Try to load the token
    const token = fs.readFileSync(TOKEN_PATH); // Read the token from the file
    oAuth2Client.setCredentials(JSON.parse(token)); // Set the credentials
    console.log("Token loaded from", TOKEN_PATH); // Log the token
  } catch (err) {
    // Handle error
    console.log("No token found, requiring user authorization"); // Log the error
  }
}

app.whenReady().then(() => {
  // Wait for the app to be ready
  createWindow(); // Create the main window

  ipcMain.on("authorize", () => {
    // Listen for the authorize event
    loadStoredToken(); // Load stored token before attempting authorization
    authorize(); // Authorize the user
  });

  ipcMain.on("load-events", (events, type) => {
    // Listen for the load-events event
    fetchEvents(type); // Fetch events of the specified type
  });
});

app.on("window-all-closed", () => {
  // Listen for the window-all-closed event
  if (process.platform !== "darwin") {
    // Check if the platform is not macOS
    app.quit(); // Quit the app
  }
});
