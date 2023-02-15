const mongoose = require("mongoose");

// Note: Mongoose Schema has no "Object type"
// https://stackoverflow.com/questions/36228599/how-to-use-mongoose-model-schema-with-dynamic-keys
// https://stackoverflow.com/questions/28200502/map-in-mongoose
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
    type: [
      {
        bnbId: String,
        name: String,
        url: String,
        rooms: [
          {
            date: String,
            roomsList: [
              {
                roomTitle: String,
                roomStatus: String,
              },
            ],
          },
        ],
      },
    ],
    default: [],
  },
  members: {
    type: Object,
  },
});

module.exports = mongoose.model("Trip", tripSchema);
