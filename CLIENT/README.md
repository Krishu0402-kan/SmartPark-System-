# SmartPark – Client Application
## Overview
SmartPark is a smart car parking management system. This is the frontend client application that communicates with the SmartPark REST API.

## Prerequisites
- SmartPark API must be running on `http://localhost:3000`
- A modern web browser (Chrome, Firefox, Edge)
- No additional dependencies required

## How to Start the Client
### Option 1: Open directly in browser (simplest)
1. Make sure the API is running first (see API readme)
2. Navigate to the `CLIENT/` folder
3. Open `dashboard.html` in your browser

### Option 2: Use Live Server (VS Code)
1. Install the **Live Server** extension in VS Code
2. Right-click `dashboard.html`
3. Click **"Open with Live Server"**

### Option 3: Use a simple HTTP server
```bash
cd CLIENT
npx serve .
```
Then open http://localhost:3000 (or whichever port is shown)

## Pages

| Page | File | Description |
|------|------|-------------|
| Dashboard | `dashboard.html` | Live slot map, stats, recent bookings |
| Book a Slot | `book-slot.html` | Normal + Emergency booking form |
| My Bookings | `my-bookings.html` | View, search, edit, delete bookings |
| Edit Booking | `edit-booking.html` | Update an existing booking |
| About | `about.html` | System info, tech stack, API reference |

## API Connection
The client connects to: `http://localhost:3000/api`

To change the API URL, edit the `const API = '...'` variable at the top of each page's `<script>` block.

## Features
- Real-time slot availability map
- Normal and emergency booking
- Search and filter bookings
- Client-side form validation
- Toast notifications
- Delete confirmation modals
- Responsive dark glass UI
