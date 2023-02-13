const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema({
  tripID: {
    type: String,
  },
  tripName: {
    type: String,
  },
  availableDates: {
    type: [String],
    default: [],
  },
  bnbs: {
    type: Object,
  },
  members: {
    type: Object,
  },
});

module.exports = mongoose.model("Trip", tripSchema);
