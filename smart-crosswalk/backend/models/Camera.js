import mongoose from 'mongoose';

const cameraSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['active', 'inactive', 'error'],
    default: 'active',
    required: true
  }
}, {
  timestamps: true
});

const Camera = mongoose.model('Camera', cameraSchema);

export default Camera;
