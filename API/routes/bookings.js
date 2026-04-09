const express = require('express');
const router = express.Router();
const db = require('../database');

/**
 * @api {get} /api/bookings Get All Bookings
 * @apiName GetAllBookings
 * @apiGroup Bookings
 * @apiVersion 1.0.0
 * @apiDescription Returns all bookings with slot details. Can be filtered by status or booking_type.
 *
 * @apiQuery {String} [status] Filter by status (active, completed, cancelled)
 * @apiQuery {String} [booking_type] Filter by type (normal, emergency)
 *
 * @apiSuccess {Number} count Total number of bookings
 * @apiSuccess {Object[]} bookings List of bookings with slot info
 * @apiSuccess {Number} bookings.id Booking ID
 * @apiSuccess {String} bookings.slot_number Slot identifier
 * @apiSuccess {String} bookings.floor Floor level
 * @apiSuccess {String} bookings.vehicle_number Vehicle registration
 * @apiSuccess {String} bookings.owner_name Owner name
 * @apiSuccess {String} bookings.phone Contact number
 * @apiSuccess {String} bookings.check_in Check-in time
 * @apiSuccess {String} bookings.check_out Check-out time
 * @apiSuccess {String} bookings.status Booking status
 * @apiSuccess {String} bookings.booking_type normal or emergency
 * @apiSuccess {Number} bookings.priority 1=emergency, 2=normal
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/1.1 200 OK
 *   { "count": 15, "bookings": [...] }
 *
 * @apiError {String} error Error message
 */
router.get('/', (req, res) => {
  try {
    const { status, booking_type } = req.query;
    let query = `
      SELECT b.*, s.slot_number, s.floor, s.type as slot_type
      FROM bookings b
      JOIN parking_slots s ON b.slot_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      const validStatuses = ['active', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be active, completed, or cancelled' });
      }
      query += ' AND b.status = ?';
      params.push(status);
    }

    if (booking_type) {
      const validTypes = ['normal', 'emergency'];
      if (!validTypes.includes(booking_type)) {
        return res.status(400).json({ error: 'Invalid booking_type. Must be normal or emergency' });
      }
      query += ' AND b.booking_type = ?';
      params.push(booking_type);
    }

    query += ' ORDER BY b.priority ASC, b.created_at DESC';
    const bookings = db.prepare(query).all(...params);
    res.json({ count: bookings.length, bookings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve bookings', details: err.message });
  }
});

/**
 * @api {get} /api/bookings/:id Get Single Booking
 * @apiName GetBooking
 * @apiGroup Bookings
 * @apiVersion 1.0.0
 * @apiDescription Returns a single booking with full slot details.
 *
 * @apiParam {Number} id Booking unique ID
 *
 * @apiSuccess {Object} booking Full booking object with slot info
 *
 * @apiError {String} error Not found message
 * @apiErrorExample {json} Not-Found:
 *   HTTP/1.1 404 Not Found
 *   { "error": "Booking not found" }
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID format' });

    const booking = db.prepare(`
      SELECT b.*, s.slot_number, s.floor, s.type as slot_type
      FROM bookings b
      JOIN parking_slots s ON b.slot_id = s.id
      WHERE b.id = ?
    `).get(id);

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve booking', details: err.message });
  }
});

/**
 * @api {post} /api/bookings/emergency Emergency Booking (Auto Assign)
 * @apiName EmergencyBooking
 * @apiGroup Bookings
 * @apiVersion 1.0.0
 * @apiDescription Creates an emergency booking with automatic slot assignment.
 *                 Finds the first available car slot and immediately assigns it.
 *                 Priority is set to 1 (highest).
 *
 * @apiBody {String} owner_name Name of the vehicle owner
 * @apiBody {String} vehicle_number Vehicle registration number
 * @apiBody {String} phone Contact phone number
 * @apiBody {String} [type=car] Slot type preference (car, bike, disabled)
 *
 * @apiSuccess {String} message Success confirmation
 * @apiSuccess {Object} booking Created emergency booking with auto-assigned slot
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/1.1 201 Created
 *   {
 *     "message": "Emergency booking created! Slot A3 has been assigned.",
 *     "booking": { ... }
 *   }
 *
 * @apiError {String} error No slots available or validation error
 * @apiErrorExample {json} No-Slots:
 *   HTTP/1.1 409 Conflict
 *   { "error": "No available slots at this time" }
 */
router.post('/emergency', (req, res) => {
  try {
    const { owner_name, vehicle_number, phone, type = 'car' } = req.body;

    // Validation
    if (!owner_name || !vehicle_number || !phone) {
      return res.status(400).json({ error: 'owner_name, vehicle_number, and phone are required' });
    }
    if (owner_name.trim().length < 2) {
      return res.status(400).json({ error: 'owner_name must be at least 2 characters' });
    }
    if (phone.trim().length < 7) {
      return res.status(400).json({ error: 'Please provide a valid phone number' });
    }

    // Auto-assign first available slot
    const slot = db.prepare(
      "SELECT * FROM parking_slots WHERE status = 'available' AND type = ? ORDER BY floor, slot_number LIMIT 1"
    ).get(type);

    if (!slot) {
      return res.status(409).json({ error: `No available ${type} slots at this time. Please try a different type.` });
    }

    const checkIn = new Date().toISOString().slice(0, 16).replace('T', ' ');

    // Use transaction
    const createEmergencyBooking = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO bookings (slot_id, vehicle_number, owner_name, phone, check_in, status, booking_type, priority)
        VALUES (?, ?, ?, ?, ?, 'active', 'emergency', 1)
      `).run(slot.id, vehicle_number.trim().toUpperCase(), owner_name.trim(), phone.trim(), checkIn);

      db.prepare("UPDATE parking_slots SET status = 'occupied' WHERE id = ?").run(slot.id);

      return result.lastInsertRowid;
    });

    const newId = createEmergencyBooking();
    const booking = db.prepare(`
      SELECT b.*, s.slot_number, s.floor, s.type as slot_type
      FROM bookings b JOIN parking_slots s ON b.slot_id = s.id
      WHERE b.id = ?
    `).get(newId);

    res.status(201).json({
      message: `🚨 Emergency booking created! Slot ${slot.slot_number} (${slot.floor} Floor) has been auto-assigned.`,
      booking
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create emergency booking', details: err.message });
  }
});

/**
 * @api {post} /api/bookings Create Normal Booking
 * @apiName CreateBooking
 * @apiGroup Bookings
 * @apiVersion 1.0.0
 * @apiDescription Creates a new parking booking for a specific slot.
 *
 * @apiBody {Number} slot_id ID of the parking slot
 * @apiBody {String} owner_name Name of the vehicle owner
 * @apiBody {String} vehicle_number Vehicle registration number
 * @apiBody {String} phone Contact phone number
 * @apiBody {String} check_in Check-in datetime (YYYY-MM-DD HH:MM)
 * @apiBody {String} [check_out] Check-out datetime (YYYY-MM-DD HH:MM)
 *
 * @apiSuccess {String} message Success message
 * @apiSuccess {Object} booking Created booking object
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/1.1 201 Created
 *   { "message": "Booking created successfully", "booking": { ... } }
 *
 * @apiError {String} error Validation or conflict error
 * @apiErrorExample {json} Occupied-Error:
 *   HTTP/1.1 409 Conflict
 *   { "error": "This slot is already occupied" }
 */
router.post('/', (req, res) => {
  try {
    const { slot_id, owner_name, vehicle_number, phone, check_in, check_out } = req.body;

    // Validation
    if (!slot_id || !owner_name || !vehicle_number || !phone || !check_in) {
      return res.status(400).json({ error: 'slot_id, owner_name, vehicle_number, phone, and check_in are required' });
    }
    if (isNaN(slot_id)) return res.status(400).json({ error: 'slot_id must be a number' });
    if (owner_name.trim().length < 2) return res.status(400).json({ error: 'owner_name must be at least 2 characters' });
    if (phone.trim().length < 7) return res.status(400).json({ error: 'Please provide a valid phone number' });

    // Check slot exists
    const slot = db.prepare('SELECT * FROM parking_slots WHERE id = ?').get(slot_id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    if (slot.status === 'occupied') return res.status(409).json({ error: 'This slot is already occupied' });

    // Check out must be after check in
    if (check_out && new Date(check_out) <= new Date(check_in)) {
      return res.status(400).json({ error: 'check_out must be after check_in' });
    }

    const createBooking = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO bookings (slot_id, vehicle_number, owner_name, phone, check_in, check_out, status, booking_type, priority)
        VALUES (?, ?, ?, ?, ?, ?, 'active', 'normal', 2)
      `).run(slot_id, vehicle_number.trim().toUpperCase(), owner_name.trim(), phone.trim(), check_in, check_out || null);

      db.prepare("UPDATE parking_slots SET status = 'occupied' WHERE id = ?").run(slot_id);

      return result.lastInsertRowid;
    });

    const newId = createBooking();
    const booking = db.prepare(`
      SELECT b.*, s.slot_number, s.floor, s.type as slot_type
      FROM bookings b JOIN parking_slots s ON b.slot_id = s.id
      WHERE b.id = ?
    `).get(newId);

    res.status(201).json({ message: 'Booking created successfully', booking });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create booking', details: err.message });
  }
});

/**
 * @api {put} /api/bookings/:id Update Booking
 * @apiName UpdateBooking
 * @apiGroup Bookings
 * @apiVersion 1.0.0
 * @apiDescription Updates an existing booking. Can update vehicle info, times, or status.
 *                 If status is set to completed or cancelled, the slot is freed automatically.
 *
 * @apiParam {Number} id Booking unique ID
 *
 * @apiBody {String} [owner_name] Updated owner name
 * @apiBody {String} [vehicle_number] Updated vehicle number
 * @apiBody {String} [phone] Updated phone number
 * @apiBody {String} [check_in] Updated check-in time
 * @apiBody {String} [check_out] Updated check-out time
 * @apiBody {String} [status] Updated status (active, completed, cancelled)
 *
 * @apiSuccess {String} message Success message
 * @apiSuccess {Object} booking Updated booking object
 *
 * @apiError {String} error Not found or validation error
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID format' });

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const {
      owner_name = booking.owner_name,
      vehicle_number = booking.vehicle_number,
      phone = booking.phone,
      check_in = booking.check_in,
      check_out = booking.check_out,
      status = booking.status
    } = req.body;

    const validStatuses = ['active', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'status must be active, completed, or cancelled' });
    }
    if (check_out && new Date(check_out) <= new Date(check_in)) {
      return res.status(400).json({ error: 'check_out must be after check_in' });
    }

    const updateBooking = db.transaction(() => {
      db.prepare(`
        UPDATE bookings SET owner_name = ?, vehicle_number = ?, phone = ?,
        check_in = ?, check_out = ?, status = ? WHERE id = ?
      `).run(owner_name.trim(), vehicle_number.trim().toUpperCase(), phone.trim(), check_in, check_out || null, status, id);

      // Free slot if booking is completed or cancelled
      if ((status === 'completed' || status === 'cancelled') && booking.status === 'active') {
        db.prepare("UPDATE parking_slots SET status = 'available' WHERE id = ?").run(booking.slot_id);
      }
    });

    updateBooking();
    const updated = db.prepare(`
      SELECT b.*, s.slot_number, s.floor, s.type as slot_type
      FROM bookings b JOIN parking_slots s ON b.slot_id = s.id
      WHERE b.id = ?
    `).get(id);

    res.json({ message: 'Booking updated successfully', booking: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update booking', details: err.message });
  }
});

/**
 * @api {delete} /api/bookings/:id Delete Booking
 * @apiName DeleteBooking
 * @apiGroup Bookings
 * @apiVersion 1.0.0
 * @apiDescription Permanently deletes a booking and frees the associated slot if active.
 *
 * @apiParam {Number} id Booking unique ID
 *
 * @apiSuccess {String} message Success message
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/1.1 200 OK
 *   { "message": "Booking #5 deleted successfully" }
 *
 * @apiError {String} error Not found message
 * @apiErrorExample {json} Not-Found:
 *   HTTP/1.1 404 Not Found
 *   { "error": "Booking not found" }
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID format' });

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const deleteBooking = db.transaction(() => {
      db.prepare('DELETE FROM bookings WHERE id = ?').run(id);
      // Free the slot if booking was active
      if (booking.status === 'active') {
        db.prepare("UPDATE parking_slots SET status = 'available' WHERE id = ?").run(booking.slot_id);
      }
    });

    deleteBooking();
    res.json({ message: `Booking #${id} deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete booking', details: err.message });
  }
});

module.exports = router;
