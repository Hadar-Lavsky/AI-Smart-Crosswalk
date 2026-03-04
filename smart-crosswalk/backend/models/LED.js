import mongoose from 'mongoose';

const ledSchema = new mongoose.Schema({
  // LED represents a physical lighting unit
  // No status or health check fields per specification
}, {
  timestamps: true
});

const LED = mongoose.model('LED', ledSchema);

export default LED;
