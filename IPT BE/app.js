require('dotenv').config();
const { swaggerUi, swaggerDocs } = require('./config/swagger'); 
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const LeaveRequest = require('./models/LeaveRequest');
const LeaveType = require('./models/LeaveType'); 

const app = express();

// --- MIDDLEWARE CONFIGURATION ---
app.use(cors()); 
app.use(express.json());


// --- HOME ROUTE (SUCCESS STATUS INDICATOR) ---
app.get('/', (req, res) => {
    res.status(200).send('Employee Leave Management Running Successfully!');
});

// --- SWAGGER REDIRECT ROUTE ---
app.get('/swagger', (req, res) => {
    res.redirect('/api-docs');
});


// --- SWAGGER ENGINE UI ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

const JWT_SECRET = process.env.JWT_SECRET || 'my_local_dev_secret_2026_leave_app';

// --- AUTH MIDDLEWARE ---
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) return res.status(401).json({ message: 'User not found' });
            next();
        } catch (error) {
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'No token provided' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Forbidden: Access restricted to ${roles.join(' or ')} only.` 
            });
        }
        next();
    };
};

// --- DATABASE CONNECTION ---
if (process.env.NODE_ENV !== 'test') {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log('✅ Connected to MongoDB'))
        .catch(err => console.error('❌ MongoDB connection error:', err));
}

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, fullName, email, department, role } = req.body;
        const userExists = await User.findOne({ username });
        if (userExists) return res.status(400).json({ message: "Username already taken" });

        const user = new User({ username, password, fullName, email, department, role });
        await user.save();
        res.status(201).json({ message: "User created successfully" });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (user && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });
            res.json({ token, role: user.role });
        } else {
            res.status(401).json({ message: "Invalid username or password" });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- LEAVE TYPE ROUTES ---
app.get('/api/leave-types', protect, async (req, res) => {
    const types = await LeaveType.find();
    res.json(types);
});

app.post('/api/leave-types', protect, authorize('Admin', 'Supervisor'), async (req, res) => {
    try {
        const newType = new LeaveType(req.body);
        await newType.save();
        res.status(201).json(newType);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

// --- LEAVE ROUTES ---

/**
 * TASK 2.5: Submit Leave with Deduction & Balance Validation
 */
app.post('/api/leave', protect, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { leaveTypeId, startDate, endDate } = req.body;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;

        // Overlap Check (with session)
        const overlap = await LeaveRequest.findOne({
            employeeId: req.user._id,
            status: { $in: ['Pending', 'Approved'] },
            $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }]
        }).session(session);

        if (overlap) {
            await session.abortTransaction();
            return res.status(400).json({ message: "Overlap detected" });
        }

        // Balance Check
        const leaveType = await LeaveType.findById(leaveTypeId).session(session);

        const previousLeaves = await LeaveRequest.find({
            employeeId: req.user._id,
            leaveTypeId: leaveTypeId,
            status: { $in: ['Approved', 'Pending'] } 
        }).session(session);

        const usedDays = previousLeaves.reduce((total, l) => {
            const start = new Date(l.startDate);
            const end = new Date(l.endDate);
            const d = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
            return total + d;
        }, 0);

        if ((usedDays + diffDays) > leaveType.maxDaysPerYear) {
            await session.abortTransaction();
            return res.status(400).json({ message: "Insufficient balance" });
        }

        // Save Request (with session)
        const leave = new LeaveRequest({ ...req.body, employeeId: req.user._id });
        await leave.save({ session });

        await session.commitTransaction();
        res.status(201).json(leave);

    } catch (err) {
        await session.abortTransaction();
        res.status(400).json({ error: err.message });
    } finally {
        session.endSession();
    }
});

/**
 * TASK 2.4: Supervisor Approval/Rejection
 */
app.patch('/api/leave/:id/status', protect, authorize('Supervisor', 'Admin'), async (req, res) => {
    try {
        const { status } = req.body; 
        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ message: "Status must be 'Approved' or 'Rejected'" });
        }

        const leave = await LeaveRequest.findById(req.params.id);
        if (!leave) return res.status(404).json({ message: "Leave request not found" });

        leave.status = status;
        await leave.save();

        res.json({ message: `Leave request has been ${status}`, leave });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/leave', protect, async (req, res) => {
    let query = {};
    
    if (req.user.role === 'Employee') {
        query = { employeeId: req.user._id };
    } 
    else if (req.user.role === 'Supervisor') {
        query = {}; 
    }

    const leaves = await LeaveRequest.find(query)
        .populate('employeeId', 'fullName department')
        .populate('leaveTypeId', 'type');
        
    res.json(leaves);
});

// --- ADMIN / REPORT ROUTES ---

/**
 * TASK 2.6: Admin Report Management
 */
app.get('/api/admin/reports', protect, authorize('Admin'), async (req, res) => {
    try {
        const report = await LeaveRequest.aggregate([
            {
                // Sort by the latest updated requests first so we pull the most relevant record details
                $sort: { updatedAt: -1 }
            },
            {
                $group: {
                    _id: "$employeeId",
                    totalRequests: { $sum: 1 },
                    approvedCount: { $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] } },
                    rejectedCount: { $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] } },
                    pendingCount: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } },
                    // Grab the details of the latest leave request submitted by the employee
                    latestReason: { $first: "$reason" },
                    startDate: { $first: "$startDate" },
                    endDate: { $first: "$endDate" },
                    updatedAt: { $first: "$updatedAt" }
                }
            },
            {
                $lookup: {
                    from: "users", 
                    localField: "_id",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" },
            {
                $project: {
                    _id: 1,
                    employeeName: "$user.fullName",
                    userEmail: "$user.email", 
                    department: "$user.department",
                    totalRequests: 1,
                    approvedCount: 1,
                    pendingCount: 1,
                    rejectedCount: 1,
                    latestReason: 1,
                    startDate: 1,
                    endDate: 1,
                    updatedAt: 1
                }
            }
        ]);
        res.json(report);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * NEW ENDPOINT: Fetch complete leave list history for an individual employee
 */
app.get('/api/admin/reports/employee/:employeeId', protect, authorize('Admin'), async (req, res) => {
    try {
        const employeeLeaves = await LeaveRequest.find({ employeeId: req.params.employeeId })
            .populate('leaveTypeId', 'type')
            .sort({ startDate: -1 }); // Sort to display the newest records at top
            
        res.json(employeeLeaves);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// --- USER MANAGEMENT ---
app.get('/api/users', protect, authorize('Supervisor', 'Admin'), async (req, res) => {
    const users = await User.find().select('-password');
    res.json(users);
});

// --- SERVER LIFE CYCLE ---
if (process.env.NODE_ENV !== 'test') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`✅ Server running on: http://localhost:${PORT}`);
        console.log(`📝 Swagger Docs available at: http://localhost:${PORT}/api-docs`);
    });
}

module.exports = app;