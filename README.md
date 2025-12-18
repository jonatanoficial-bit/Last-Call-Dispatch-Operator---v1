# Last Call Dispatch Operator (Prototype)

This repository contains a simplified prototype implementation of **Last Call Dispatch Operator**, a game inspired by real‑world emergency call centers.  
The purpose of this prototype is to demonstrate the core gameplay loop and architecture outlined in the design document.  

## Features

* **Call Handling** – The player receives scripted emergency calls representing different services (police, fire, medical and a false alarm).  
  They must choose the appropriate response from a list of options.  Correct choices award points, while incorrect choices incur a penalty.  
  Each call displays a short instruction based on real protocols (e.g. evacuate during a fire, perform CPR for a cardiac arrest).

* **Incident Creation** – For real calls, an incident marker appears on a 10×10 city grid at a predefined location.  The marker pulses until resolved.

* **Dispatching Units** – The player manages a fleet of emergency units: police cars, fire trucks and ambulances.  
  Units are listed alongside their current coordinates and can be dispatched to an incident if they match the incident type.  
  The selected unit moves step by step along a Manhattan path to the incident; upon arrival the incident is resolved and points are awarded.

* **Time and Scoring** – A timer counts the elapsed time.  The game tracks the number of calls handled and the player’s score.  At the end of all calls, a results screen summarises performance.

## Running the game

To run the game locally:

1. Download or clone this repository.
2. Open `index.html` in any modern web browser (Chrome, Firefox, Edge).  
   No server is required; all assets are loaded locally.
3. Click **Start Game** to begin.  Handle each call in turn, dispatch units and see how many points you can score.

## Files

- `index.html` – Main markup for the game interface.  
- `styles.css` – Styling for the layout, map grid, units and controls.  
- `script.js` – Game logic: call handling, unit movement, scoring and state management.  
- `README.md` – This file.

## Notes

This prototype is not a full AAA game.  It focuses on showing how the design principles can be translated into a working foundation using plain HTML, CSS and JavaScript.  
Future iterations would expand upon the number of calls, randomisation, multilingual support, dynamic city maps, more nuanced call scripts, a tutorial mode, and eventually multiplayer functionality.