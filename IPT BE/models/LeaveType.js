const mongoose = require('mongoose');
const leaveTypeSchema = new mongoose.Schema({
  type: { type: String, required: true },
  maxDaysPerYear: { type: Number, required: true }
});
module.exports = mongoose.model('LeaveType', leaveTypeSchema);