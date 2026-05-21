require('dotenv').config(); // Add this line!
const request = require('supertest');
const app = require('../app'); // Path to your app.js
const mongoose = require('mongoose');
const User = require('../models/User');
const LeaveType = require('../models/LeaveType');
const LeaveRequest = require('../models/LeaveRequest');
const jwt = require('jsonwebtoken');

describe('Security & Load Testing (Task 5.3)', () => {
    let token, userId, sickLeaveId;

    beforeAll(async () => {
        // Use your test database URI
        await mongoose.connect(process.env.MONGO_URI_TEST);``
        
        // Clean up and setup dummy data
        await User.deleteMany({});
        await LeaveType.deleteMany({});
        await LeaveRequest.deleteMany({});

        const user = await User.create({
            username: 'loadtest',
            password: 'password123',
            fullName: 'Load Test User',
            role: 'Employee',
            department: 'QA',
            email: 'load@test.com'
        });
        userId = user._id;
        token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);

        const leaveType = await LeaveType.create({
            typeName: 'Sick Leave',
            type: 'Sick Leave',
            maxDaysPerYear: 1
        });
        sickLeaveId = leaveType._id;
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    test('Should handle concurrent requests without double-spending balance', async () => {
        // We fire 5 requests at once for the same 1-day balance
        const requests = Array(5).fill(0).map(() => 
            request(app)
                .post('/api/leave')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    leaveTypeId: sickLeaveId,
                    startDate: '2026-10-01',
                    endDate: '2026-10-01',
                    reason: 'Concurrent Test'
                })
        );

        const responses = await Promise.all(requests);

        // Analyze results
        const success = responses.filter(r => r.statusCode === 201);
        const failed = responses.filter(r => r.statusCode === 400);

        console.log(`Successes: ${success.length}, Failures: ${failed.length}`);

        // Only 1 should have succeeded because we only have 1 day of Sick Leave
        expect(success.length).toBe(1);
    });
});