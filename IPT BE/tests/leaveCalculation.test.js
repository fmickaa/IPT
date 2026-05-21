const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app'); // Ensure your app.js exports 'app'
const User = require('../models/User');
const LeaveType = require('../models/LeaveType');

let mongoServer;
let token;
let sickLeaveId;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Create a dummy user and get a token for testing
    const user = new User({
        username: 'testuser',
        password: 'password123',
        fullName: 'Test User',
        role: 'Employee',
        department: 'Engineering', // Added this
        email: 'test@company.com'   // Added this
    });
    await user.save();

    // Login to get token
    const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'password123' });
    token = res.body.token;

    // Create a Leave Type: Sick Leave (5 days max)
    const lt = new LeaveType({ type: 'Sick Leave', maxDaysPerYear: 5 });
    const savedLt = await lt.save();
    sickLeaveId = savedLt._id;
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Leave Calculation & Integration Tests (Task 5.1)', () => {
    
    test('Should allow a request within the balance limit', async () => {
        const res = await request(app)
            .post('/api/leave')
            .set('Authorization', `Bearer ${token}`)
            .send({
                leaveTypeId: sickLeaveId,
                startDate: '2026-05-01',
                endDate: '2026-05-02', // 2 days
                reason: 'Feeling unwell'
            });
        expect(res.statusCode).toBe(201);
    });

    test('Should REJECT overlapping date requests', async () => {
    // The first test created a leave for 2026-05-01 to 2026-05-02
    // We will try to request 2026-05-01 again (exact same day)
    const res = await request(app)
        .post('/api/leave')
        .set('Authorization', `Bearer ${token}`)
        .send({
            leaveTypeId: sickLeaveId,
            startDate: '2026-05-01', 
            endDate: '2026-05-01',
            reason: 'This is a duplicate date'
        });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('Overlap detected');
    });

    test('Should REJECT overlapping date requests', async () => {
        // We already have a request for May 1-2 from the first test
        const res = await request(app)
            .post('/api/leave')
            .set('Authorization', `Bearer ${token}`)
            .send({
                leaveTypeId: sickLeaveId,
                startDate: '2026-05-02', 
                endDate: '2026-05-04',
                reason: 'Overlapping'
            });
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toContain('Overlap detected');
    });
});