# SmartPark – CET252 Portfolio Task B2

Smart Car Parking Management System built with Node.js, Express, SQLite, and Vanilla JS.

## Folder Structure

```
cet252/
├── API/        → Node.js REST API (Express + SQLite)
├── CLIENT/     → Frontend web application (HTML/CSS/JS)
└── APIDOC/     → Generated API documentation (run build-docs first)
```

## Quick Start

### 1. Start the API
```bash
cd API
npm install
npm start
```
API runs at: `http://localhost:3000`

### 2. Open the Client
```bash
# Open CLIENT/dashboard.html in your browser
# Or use a local server:
cd CLIENT
npx serve .
```

### 3. Run Tests
```bash
cd API
npm test
```

### 4. Build API Documentation
```bash
cd API
npm run build-docs
# Then open APIDOC/index.html
```

## Features
- Full CRUD for parking slots and bookings
- Emergency auto-assign booking
- Real-time slot availability map
- Search, filter, edit and delete bookings
- Client-side + server-side validation
- 22 seeded parking slots, 15 seeded bookings
## API Endpoints

- GET /api/slots
- GET /api/bookings
- POST /api/bookings
- PUT /api/bookings/1
- DELETE /api/bookings/1

## Usage
##  API Usage Examples

### Create Booking
POST /api/bookings

Request:
{
  "name": "Krishu",
  "slot": "A1"
}

Response:
{
  "message": "Booking created successfully"
}

---

### 🔹 Update Booking
PUT /api/bookings/1

Request:
{
  "name": "Krishu Updated",
  "slot": "B2"
}

Response:
{
  "message": "Booking updated successfully"
}

---

### Delete Booking
DELETE /api/bookings/1

Response:
{
  "message": "Booking deleted successfully"
}