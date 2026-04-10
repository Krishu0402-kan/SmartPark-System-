const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Remove test database before tests
const testDbPath = path.join(__dirname, '..', 'db', 'smartpark.db');
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

process.env.NODE_ENV = 'test';
const app = require('./server');;

// ─── SLOTS TESTS ────────────────────────────────────────────────────────────

describe('🅿️  Slots API', () => {

  // GET /api/slots
  describe('GET /api/slots', () => {
    test('should return all slots with count', async () => {
      const res = await request(app).get('/api/slots');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('count');
      expect(res.body).toHaveProperty('slots');
      expect(Array.isArray(res.body.slots)).toBe(true);
      expect(res.body.count).toBeGreaterThan(0);
    });

    test('should filter slots by type=car', async () => {
      const res = await request(app).get('/api/slots?type=car');
      expect(res.statusCode).toBe(200);
      res.body.slots.forEach(slot => expect(slot.type).toBe('car'));
    });

    test('should filter slots by status=available', async () => {
      const res = await request(app).get('/api/slots?status=available');
      expect(res.statusCode).toBe(200);
      res.body.slots.forEach(slot => expect(slot.status).toBe('available'));
    });

    test('should return 400 for invalid type', async () => {
      const res = await request(app).get('/api/slots?type=truck');
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('should return 400 for invalid status', async () => {
      const res = await request(app).get('/api/slots?status=broken');
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  // GET /api/slots/available
  describe('GET /api/slots/available', () => {
    test('should return only available slots', async () => {
      const res = await request(app).get('/api/slots/available');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('count');
      res.body.slots.forEach(slot => expect(slot.status).toBe('available'));
    });

    test('should filter available slots by type=bike', async () => {
      const res = await request(app).get('/api/slots/available?type=bike');
      expect(res.statusCode).toBe(200);
      res.body.slots.forEach(slot => {
        expect(slot.status).toBe('available');
        expect(slot.type).toBe('bike');
      });
    });
  });

  // GET /api/slots/:id
  describe('GET /api/slots/:id', () => {
    test('should return a single slot by ID', async () => {
      const res = await request(app).get('/api/slots/1');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('slot_number');
      expect(res.body).toHaveProperty('floor');
      expect(res.body).toHaveProperty('type');
      expect(res.body).toHaveProperty('status');
    });

    test('should return 404 for non-existent slot', async () => {
      const res = await request(app).get('/api/slots/99999');
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Slot not found');
    });

    test('should return 400 for invalid ID format', async () => {
      const res = await request(app).get('/api/slots/abc');
      expect(res.statusCode).toBe(400);
    });
  });

  // POST /api/slots
  describe('POST /api/slots', () => {
    const uniqueSlot = 'Z' + Date.now();
    test('should create a new slot successfully', async () => {
      const res = await request(app).post('/api/slots').send({
       slot_number: 'Z' + Date.now(),
        floor: 'Third',
        type: 'car',
        status: 'available'
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('Slot created successfully');
      expect(res.body.slot.slot_number).toBe(uniqueSlot);
    });

    test('should return 400 if required fields missing', async () => {
      const res = await request(app).post('/api/slots').send({ slot_number: 'X1' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('should return 409 for duplicate slot_number', async () => {
      const res = await request(app).post('/api/slots').send({
        slot_number: 'Z99',
        floor: 'Third',
        type: 'car'
      });
      expect(res.statusCode).toBe(409);
    });

    test('should return 400 for invalid type', async () => {
      const res = await request(app).post('/api/slots').send({
        slot_number: 'X2',
        floor: 'Ground',
        type: 'truck'
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // PUT /api/slots/:id
  describe('PUT /api/slots/:id', () => {
    test('should update a slot successfully', async () => {
      const res = await request(app).put('/api/slots/1').send({ floor: 'Second' });
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Slot updated successfully');
      expect(res.body.slot.floor).toBe('Second');
    });

    test('should return 404 for non-existent slot', async () => {
      const res = await request(app).put('/api/slots/99999').send({ floor: 'Ground' });
      expect(res.statusCode).toBe(404);
    });

    test('should return 400 for invalid status value', async () => {
      const res = await request(app).put('/api/slots/1').send({ status: 'broken' });
      expect(res.statusCode).toBe(400);
    });
  });

  // DELETE /api/slots/:id
  describe('DELETE /api/slots/:id', () => {
    test('should delete an available slot', async () => {
      // Create a slot to delete
      const createRes = await request(app).post('/api/slots').send({
        slot_number: 'DEL01',
        floor: 'Ground',
        type: 'bike'
      });
      const slotId = createRes.body.slot.id;
      const res = await request(app).delete(`/api/slots/${slotId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('deleted successfully');
    });

    test('should return 404 for non-existent slot', async () => {
      const res = await request(app).delete('/api/slots/99999');
      expect(res.statusCode).toBe(404);
    });
  });
});

// ─── BOOKINGS TESTS ─────────────────────────────────────────────────────────

describe('📅 Bookings API', () => {
  let bookingId;

  // GET /api/bookings
  describe('POST /api/slots', () => {
    const uniqueSlot = 'Z' + Date.now();
  const uniqueSlot = 'Z' + Date.now();

  test('should create a new slot successfully', async () => {
    const res = await request(app).post('/api/slots').send({
      slot_number: uniqueSlot,
      floor: 'Third',
      type: 'car',
      status: 'available'
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Slot created successfully');
    expect(res.body.slot.slot_number).toBe(uniqueSlot);
  });

  test('should return 400 if required fields missing', async () => {
    const res = await request(app).post('/api/slots').send({ slot_number: 'X1' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('should return 409 for duplicate slot_number', async () => {
    const res = await request(app).post('/api/slots').send({
      slot_number: uniqueSlot,
      floor: 'Third',
      type: 'car'
    });
    expect(res.statusCode).toBe(409);
  });

  test('should return 400 for invalid type', async () => {
    const res = await request(app).post('/api/slots').send({
      slot_number: 'X2',
      floor: 'Ground',
      type: 'truck'
    });
    expect(res.statusCode).toBe(400);
  });
});

  // POST /api/bookings/emergency
  describe('POST /api/bookings/emergency', () => {
    test('should create an emergency booking with auto-assigned slot', async () => {
      const res = await request(app).post('/api/bookings/emergency').send({
        owner_name: 'Emergency User',
        vehicle_number: 'EM01 XYZ',
        phone: '07700999999'
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.booking.booking_type).toBe('emergency');
      expect(res.body.booking.priority).toBe(1);
      expect(res.body).toHaveProperty('message');
    });

    test('should return 400 if required fields missing', async () => {
      const res = await request(app).post('/api/bookings/emergency').send({
        owner_name: 'Test'
      });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  // POST /api/bookings
  describe('POST /api/bookings', () => {
    test('should create a normal booking successfully', async () => {
      // Get an available slot
      const slotsRes = await request(app).get('/api/slots/available?type=car');
      const availableSlot = slotsRes.body.slots[0];

      const res = await request(app).post('/api/bookings').send({
        slot_id: availableSlot.id,
        owner_name: 'John Doe',
        vehicle_number: 'JD21 TEST',
        phone: '07700123456',
        check_in: '2025-06-01 09:00',
        check_out: '2025-06-01 11:00'
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('Booking created successfully');
      expect(res.body.booking.owner_name).toBe('John Doe');
      bookingId = res.body.booking.id;
    });

    test('should return 400 if required fields missing', async () => {
      const res = await request(app).post('/api/bookings').send({ owner_name: 'Jane' });
      expect(res.statusCode).toBe(400);
    });

    test('should return 400 if check_out is before check_in', async () => {
      const slotsRes = await request(app).get('/api/slots/available');
      const slot = slotsRes.body.slots[0];
      const res = await request(app).post('/api/bookings').send({
        slot_id: slot.id,
        owner_name: 'Bad Time',
        vehicle_number: 'BT22 AAA',
        phone: '07700000001',
        check_in: '2025-06-01 11:00',
        check_out: '2025-06-01 09:00'
      });
      expect(res.statusCode).toBe(400);
    });

    test('should return 404 for non-existent slot', async () => {
      const res = await request(app).post('/api/bookings').send({
        slot_id: 99999,
        owner_name: 'Ghost',
        vehicle_number: 'GH11 XXX',
        phone: '07700000002',
        check_in: '2025-06-01 09:00'
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // GET /api/bookings/:id
  describe('GET /api/bookings/:id', () => {
    test('should return a booking by ID', async () => {
      const res = await request(app).get(`/api/bookings/${bookingId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('owner_name');
      expect(res.body).toHaveProperty('slot_number');
    });

    test('should return 404 for non-existent booking', async () => {
      const res = await request(app).get('/api/bookings/99999');
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Booking not found');
    });

    test('should return 400 for invalid ID', async () => {
      const res = await request(app).get('/api/bookings/notanid');
      expect(res.statusCode).toBe(400);
    });
  });

  // PUT /api/bookings/:id
  describe('PUT /api/bookings/:id', () => {
    test('should update a booking successfully', async () => {
      const res = await request(app).put(`/api/bookings/${bookingId}`).send({
        owner_name: 'John Updated',
        phone: '07700999000'
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.booking.owner_name).toBe('John Updated');
    });

    test('should return 404 for non-existent booking', async () => {
      const res = await request(app).put('/api/bookings/99999').send({ owner_name: 'Ghost' });
      expect(res.statusCode).toBe(404);
    });

    test('should return 400 for invalid status', async () => {
      const res = await request(app).put(`/api/bookings/${bookingId}`).send({ status: 'pending' });
      expect(res.statusCode).toBe(400);
    });

    test('should free slot when status set to completed', async () => {
      const res = await request(app).put(`/api/bookings/${bookingId}`).send({ status: 'completed' });
      expect(res.statusCode).toBe(200);
      expect(res.body.booking.status).toBe('completed');
    });
  });

  // DELETE /api/bookings/:id
  describe('DELETE /api/bookings/:id', () => {
    test('should delete a booking successfully', async () => {
      // Create one to delete
      const slotsRes = await request(app).get('/api/slots/available');
      const slot = slotsRes.body.slots[0];
      const createRes = await request(app).post('/api/bookings').send({
        slot_id: slot.id,
        owner_name: 'Delete Me',
        vehicle_number: 'DEL1 AAA',
        phone: '07700111222',
        check_in: '2025-06-10 08:00'
      });
      const id = createRes.body.booking.id;
      const res = await request(app).delete(`/api/bookings/${id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('deleted successfully');
    });

    test('should return 404 for non-existent booking', async () => {
      const res = await request(app).delete('/api/bookings/99999');
      expect(res.statusCode).toBe(404);
    });
  });
});

// ─── GENERAL ─────────────────────────────────────────────────────────────────

describe('🌐 General', () => {
  test('GET / should return API info', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('running');
  });

  test('Unknown route should return 404', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.statusCode).toBe(404);
  });
});

