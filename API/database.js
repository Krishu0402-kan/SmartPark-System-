const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'db', 'smartpark.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS parking_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_number TEXT NOT NULL UNIQUE,
    floor TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('car', 'bike', 'disabled')),
    status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'occupied')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_id INTEGER NOT NULL,
    vehicle_number TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    check_in DATETIME NOT NULL,
    check_out DATETIME,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
    booking_type TEXT NOT NULL DEFAULT 'normal' CHECK(booking_type IN ('normal', 'emergency')),
    priority INTEGER NOT NULL DEFAULT 2,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (slot_id) REFERENCES parking_slots(id)
  );
`);

// Seed data only if tables are empty
const slotCount = db.prepare('SELECT COUNT(*) as count FROM parking_slots').get();

if (slotCount.count === 0) {
  const insertSlot = db.prepare(`
    INSERT INTO parking_slots (slot_number, floor, type, status) VALUES (?, ?, ?, ?)
  `);

  const slots = [
    // Ground Floor - Cars
    ['A1', 'Ground', 'car', 'available'],
    ['A2', 'Ground', 'car', 'occupied'],
    ['A3', 'Ground', 'car', 'available'],
    ['A4', 'Ground', 'car', 'occupied'],
    ['A5', 'Ground', 'car', 'available'],
    // Ground Floor - Disabled
    ['D1', 'Ground', 'disabled', 'available'],
    ['D2', 'Ground', 'disabled', 'occupied'],
    // Ground Floor - Bikes
    ['B1', 'Ground', 'bike', 'available'],
    ['B2', 'Ground', 'bike', 'available'],
    ['B3', 'Ground', 'bike', 'occupied'],
    // First Floor - Cars
    ['C1', 'First', 'car', 'available'],
    ['C2', 'First', 'car', 'available'],
    ['C3', 'First', 'car', 'occupied'],
    ['C4', 'First', 'car', 'available'],
    ['C5', 'First', 'car', 'occupied'],
    // First Floor - Bikes
    ['E1', 'First', 'bike', 'available'],
    ['E2', 'First', 'bike', 'available'],
    // Second Floor - Cars
    ['F1', 'Second', 'car', 'available'],
    ['F2', 'Second', 'car', 'available'],
    ['F3', 'Second', 'car', 'available'],
    ['F4', 'Second', 'car', 'occupied'],
    ['F5', 'Second', 'car', 'available'],
  ];

  const insertMany = db.transaction((slots) => {
    for (const slot of slots) insertSlot.run(...slot);
  });
  insertMany(slots);

  // Seed bookings
  const insertBooking = db.prepare(`
    INSERT INTO bookings (slot_id, vehicle_number, owner_name, phone, check_in, check_out, status, booking_type, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const bookings = [
    [2,  'LN21 ABC', 'James Smith',    '07700900001', '2025-04-01 08:00', '2025-04-01 10:00', 'completed', 'normal',    2],
    [4,  'YK19 XYZ', 'Sarah Johnson',  '07700900002', '2025-04-01 09:00', '2025-04-01 11:00', 'completed', 'normal',    2],
    [7,  'MN22 DEF', 'Robert Brown',   '07700900003', '2025-04-02 07:30', '2025-04-02 09:30', 'completed', 'normal',    2],
    [10, 'SR20 GHI', 'Emily Davis',    '07700900004', '2025-04-02 10:00', '2025-04-02 12:00', 'completed', 'emergency', 1],
    [13, 'BD18 JKL', 'Michael Wilson', '07700900005', '2025-04-03 08:00', '2025-04-03 10:00', 'completed', 'normal',    2],
    [15, 'OX21 MNO', 'Jessica Taylor', '07700900006', '2025-04-03 11:00', '2025-04-03 13:00', 'completed', 'normal',    2],
    [21, 'CV19 PQR', 'Daniel Anderson','07700900007', '2025-04-04 09:00', '2025-04-04 11:00', 'completed', 'emergency', 1],
    [2,  'SW22 STU', 'Laura Thomas',   '07700900008', '2025-04-05 08:00', null,                'active',    'normal',    2],
    [4,  'EX20 VWX', 'Christopher Lee','07700900009', '2025-04-05 09:30', null,                'active',    'normal',    2],
    [7,  'NR21 YZA', 'Amanda Harris',  '07700900010', '2025-04-05 10:00', null,                'active',    'emergency', 1],
    [10, 'GL18 BCD', 'Kevin Martin',   '07700900011', '2025-04-06 07:00', null,                'active',    'normal',    2],
    [13, 'HX22 EFG', 'Stephanie Clark','07700900012', '2025-04-06 08:30', null,                'active',    'normal',    2],
    [15, 'WR19 HIJ', 'Andrew Lewis',   '07700900013', '2025-04-06 09:00', null,                'active',    'normal',    2],
    [21, 'TS21 KLM', 'Rachel Walker',  '07700900014', '2025-04-06 10:30', null,                'active',    'emergency', 1],
    [3,  'BN20 NOP', 'Joshua Hall',    '07700900015', '2025-04-07 08:00', '2025-04-07 10:00', 'cancelled', 'normal',    2],
  ];

  const insertBookingMany = db.transaction((bookings) => {
    for (const b of bookings) insertBooking.run(...b);
  });
  insertBookingMany(bookings);

  console.log('✅ Database seeded with sample data');
}

module.exports = db;
