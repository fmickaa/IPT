const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  leaveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: String,
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  submittedAt: { type: Date, default: Date.now }
});

// At the bottom of LeaveRequest.js, before module.exports
leaveRequestSchema.index({ employeeId: 1, startDate: 1, endDate: 1 }, { unique: true });
module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);