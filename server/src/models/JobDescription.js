const mongoose = require('mongoose');

const JobDescriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    default: 'Target Role',
  },
  filename: {
    type: String,
    default: '',
  },
  rawText: {
    type: String,
    default: '',
  },
  parsedData: {
    roleTitle: { type: String, default: '' },
    requiredSkills: [{ type: String }],
    responsibilities: [{ type: String }],
    experienceLevel: { type: String, default: '' },
    summary: { type: String, default: '' },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('JobDescription', JobDescriptionSchema);
