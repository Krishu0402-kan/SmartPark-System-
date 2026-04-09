const express = require('express');
const router = express.Router();
const db = require('../database');

/**
 * @api {get} /api/slots Get All Parking Slots
 * @apiName GetAllSlots
 * @apiGroup Slots
 * @apiVersion 1.0.0
 * @apiDescription Returns a list of all parking slots. Can be filtered by type or status.
 *
 * @apiQuery {String} [type] Filter by slot type (car, bike, disabled)
 * @apiQuery {String} [status] Filter by status (available, occupied)
 *
 * @apiSuccess {Object[]} slots List of parking slots
 * @apiSuccess {Number} slots.id Slot unique ID
 * @apiSuccess {String} slots.slot_number Slot identifier (e.g. A1)
 * @apiSuccess {String} slots.floor Floor level (Ground, First, Second)
 * @apiSuccess {String} slots.type Slot type (car/bike/disabled)
 * @apiSuccess {String} slots.status Current status (available/occupied)
 * @apiSuccess {String} slots.created_at Creation timestamp
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/1.1 200 OK
 *   {
 *     "count": 22,
 *     "slots": [
 *       {
 *         "id": 1,
 *         "slot_number": "A1",
 *         "floor": "Ground",
 *         "type": "car",
 *         "status": "available",
 *         "created_at": "2025-04-01 08:00:00"
 *       }
 *     ]
 *   }
 *
 * @apiError {String} error Error message
 * @apiErrorExample {json} Error-Response:
 *   HTTP/1.1 500 Internal Server Error
 *   { "error": "Failed to retrieve slots" }
 */
router.get('/', (req, res) => {
  try {
    const { type, status } = req.query;
    let query = 'SELECT * FROM parking_slots WHERE 1=1';
    const params = [];

    if (type) {
      const validTypes = ['car', 'bike', 'disabled'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid type. Must be car, bike, or disabled' });
      }
      query += ' AND type = ?';
      params.push(type);
    }

    if (status) {
      const validStatuses = ['available', 'occupied'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be available or occupied' });
      }
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY floor, slot_number';
    const slots = db.prepare(query).all(...params);
    res.json({ count: slots.length, slots });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve slots', details: err.message });
  }
});

/**
 * @api {get} /api/slots/available Get Available Slots
 * @apiName GetAvailableSlots
 * @apiGroup Slots
 * @apiVersion 1.0.0
 * @apiDescription Returns only available parking slots, optionally filtered by type.
 *
 * @apiQuery {String} [type] Filter by slot type (car, bike, disabled)
 *
 * @apiSuccess {Number} count Number of available slots
 * @apiSuccess {Object[]} slots List of available slots
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/1.1 200 OK
 *   { "count": 12, "slots": [...] }
 *
 * @apiError {String} error Error message
 */
router.get('/available', (req, res) => {
  try {
    const { type } = req.query;
    let query = "SELECT * FROM parking_slots WHERE status = 'available'";
    const params = [];

    if (type) {
      const validTypes = ['car', 'bike', 'disabled'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid type. Must be car, bike, or disabled' });
      }
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY floor, slot_number';
    const slots = db.prepare(query).all(...params);
    res.json({ count: slots.length, slots });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve available slots', details: err.message });
  }
});

/**
 * @api {get} /api/slots/:id Get Single Slot
 * @apiName GetSlot
 * @apiGroup Slots
 * @apiVersion 1.0.0
 * @apiDescription Returns a single parking slot by its ID.
 *
 * @apiParam {Number} id Slot unique ID
 *
 * @apiSuccess {Number} id Slot ID
 * @apiSuccess {String} slot_number Slot identifier
 * @apiSuccess {String} floor Floor level
 * @apiSuccess {String} type Slot type
 * @apiSuccess {String} status Slot status
 *
 * @apiError {String} error Not found message
 * @apiErrorExample {json} Not-Found:
 *   HTTP/1.1 404 Not Found
 *   { "error": "Slot not found" }
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID format' });

    const slot = db.prepare('SELECT * FROM parking_slots WHERE id = ?').get(id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    res.json(slot);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve slot', details: err.message });
  }
});

/**
 * @api {post} /api/slots Create New Slot
 * @apiName CreateSlot
 * @apiGroup Slots
 * @apiVersion 1.0.0
 * @apiDescription Creates a new parking slot.
 *
 * @apiBody {String} slot_number Slot identifier (e.g. A1) - must be unique
 * @apiBody {String} floor Floor level (Ground, First, Second)
 * @apiBody {String} type Slot type (car, bike, disabled)
 * @apiBody {String} [status=available] Slot status (available, occupied)
 *
 * @apiSuccess {String} message Success message
 * @apiSuccess {Object} slot Created slot object
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/1.1 201 Created
 *   { "message": "Slot created successfully", "slot": { ... } }
 *
 * @apiError {String} error Validation or conflict error
 * @apiErrorExample {json} Validation-Error:
 *   HTTP/1.1 400 Bad Request
 *   { "error": "slot_number, floor, and type are required" }
 */
router.post('/', (req, res) => {
  try {
    const { slot_number, floor, type, status = 'available' } = req.body;

    // Validation
    if (!slot_number || !floor || !type) {
      return res.status(400).json({ error: 'slot_number, floor, and type are required' });
    }
    if (!['car', 'bike', 'disabled'].includes(type)) {
      return res.status(400).json({ error: 'type must be car, bike, or disabled' });
    }
    if (!['available', 'occupied'].includes(status)) {
      return res.status(400).json({ error: 'status must be available or occupied' });
    }

    // Check duplicate
    const existing = db.prepare('SELECT id FROM parking_slots WHERE slot_number = ?').get(slot_number);
    if (existing) return res.status(409).json({ error: `Slot number ${slot_number} already exists` });

    const result = db.prepare(
      'INSERT INTO parking_slots (slot_number, floor, type, status) VALUES (?, ?, ?, ?)'
    ).run(slot_number, floor, type, status);

    const slot = db.prepare('SELECT * FROM parking_slots WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Slot created successfully', slot });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create slot', details: err.message });
  }
});

/**
 * @api {put} /api/slots/:id Update Slot
 * @apiName UpdateSlot
 * @apiGroup Slots
 * @apiVersion 1.0.0
 * @apiDescription Updates an existing parking slot.
 *
 * @apiParam {Number} id Slot unique ID
 *
 * @apiBody {String} [slot_number] New slot identifier
 * @apiBody {String} [floor] New floor level
 * @apiBody {String} [type] New slot type (car, bike, disabled)
 * @apiBody {String} [status] New status (available, occupied)
 *
 * @apiSuccess {String} message Success message
 * @apiSuccess {Object} slot Updated slot object
 *
 * @apiError {String} error Not found or validation error
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID format' });

    const slot = db.prepare('SELECT * FROM parking_slots WHERE id = ?').get(id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    // Validate incoming values BEFORE applying defaults
    if (req.body.type !== undefined && !['car', 'bike', 'disabled'].includes(req.body.type)) {
      return res.status(400).json({ error: 'type must be car, bike, or disabled' });
    }
    if (req.body.status !== undefined && !['available', 'occupied'].includes(req.body.status)) {
      return res.status(400).json({ error: 'status must be available or occupied' });
    }

    const { slot_number = slot.slot_number, floor = slot.floor, type = slot.type, status = slot.status } = req.body;

    // Check duplicate slot_number (not self)
    const duplicate = db.prepare('SELECT id FROM parking_slots WHERE slot_number = ? AND id != ?').get(slot_number, id);
    if (duplicate) return res.status(409).json({ error: `Slot number ${slot_number} already exists` });

    db.prepare(
      'UPDATE parking_slots SET slot_number = ?, floor = ?, type = ?, status = ? WHERE id = ?'
    ).run(slot_number, floor, type, status, id);

    const updated = db.prepare('SELECT * FROM parking_slots WHERE id = ?').get(id);
    res.json({ message: 'Slot updated successfully', slot: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update slot', details: err.message });
  }
});

/**
 * @api {delete} /api/slots/:id Delete Slot
 * @apiName DeleteSlot
 * @apiGroup Slots
 * @apiVersion 1.0.0
 * @apiDescription Deletes a parking slot. Cannot delete occupied slots.
 *
 * @apiParam {Number} id Slot unique ID
 *
 * @apiSuccess {String} message Success message
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/1.1 200 OK
 *   { "message": "Slot A1 deleted successfully" }
 *
 * @apiError {String} error Not found or conflict error
 * @apiErrorExample {json} Conflict-Error:
 *   HTTP/1.1 409 Conflict
 *   { "error": "Cannot delete an occupied slot" }
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID format' });

    const slot = db.prepare('SELECT * FROM parking_slots WHERE id = ?').get(id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    if (slot.status === 'occupied') {
      return res.status(409).json({ error: 'Cannot delete an occupied slot. Please complete or cancel the booking first.' });
    }

    db.prepare('DELETE FROM parking_slots WHERE id = ?').run(id);
    res.json({ message: `Slot ${slot.slot_number} deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete slot', details: err.message });
  }
});

module.exports = router;
