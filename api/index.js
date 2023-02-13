const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const cors = require("cors");

const Trip = require("./models").tripModel;
const { twstayBnbNameGetter, twstayCrawler } = require("./crawler");

const app = express();

//connect to Database
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("connect to MongoDB container");
  })
  .catch((e) => {
    console.log(e);
  });

// middelwares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get("/", (req, res) => {
  res.status(301).redirect("https://goto-travel.vercel.app/");
});

// routes
app.get("/api", (req, res) => {
  res.send("It's api of goto-travel.");
});

app.post("/api/trip", async (req, res) => {
  const { tripName, availableDates } = req.body;
  const newTrip = new Trip({
    tripName,
    availableDates,
  });

  try {
    const savedTrip = await newTrip.save();
    res.status(200).send({
      mongoId: savedTrip._id,
    });
  } catch (err) {
    res.status(500).send("Create Trip failed, please try again.");
  }
});

app.get("/api/trip/:tripId", async (req, res) => {
  const { tripId } = req.params;
  try {
    const tripData = await Trip.findById(tripId);
    res.send(tripData);
  } catch (err) {
    res.status(500).send(err);
  }
});

// 新增成員，前端會檢查是否已存在，後端只需負責新增
app.post("/api/trip/:tripId/members", async (req, res) => {
  const { tripId } = req.params;
  const { username } = req.body;
  try {
    const tripData = await Trip.findById(tripId);
    const datesVote = {};
    tripData.availableDates.forEach((date) => {
      datesVote[date] = "";
    });
    console.log(tripData);
    if (tripData.members) {
      tripData.members[username] = { datesVote };
    } else {
      tripData.members = { [username]: { datesVote } };
    }
    await tripData.save();
    res.send({ [username]: { datesVote } });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

// user vote on dates
app.patch("/api/trip/:tripId/members/:userName", async (req, res) => {
  const { tripId, userName } = req.params;
  const { datesVote } = req.body;
  try {
    const tripData = await Trip.findById(tripId);
    tripData.members[userName].datesVote = datesVote;
    await tripData.save();
    res.send("Successfully updated.");
  } catch (error) {
    res.status(500).send("Something went wrong!");
  }
});

// 爬蟲並存進 trip 裡
app.post("/api/trip/:tripId/bnbs", async (req, res) => {
  const { tripId } = req.params;
  const { bnbId, dates } = req.body;
  console.log(`${tripId}: Request available rooms of ${bnbId}`);
  const bookingUrl = "https://twstay.com/RWD2/booking.aspx?BNB=" + bnbId;
  try {
    // get bnb name
    const bnbName = await twstayBnbNameGetter(bookingUrl);
    const bnb = {};
    bnb.name = bnbName;
    bnb.url = bookingUrl;
    bnb.rooms = {};

    // get bnb rooms
    await Promise.all(
      dates.map(async (date) => {
        bnb.rooms[date] = [];
        try {
          const data = await twstayCrawler(bookingUrl, date);
          data.forEach((room) => {
            const roomInfo = {};
            roomInfo.roomTitle = room.roomTitle;
            if (room.hasNoRoom) {
              roomInfo.roomStatus = "沒有空房";
            } else {
              roomInfo.roomStatus =
                room.roomPrice + "元" + room.roomRemain + "間";
            }
            bnb.rooms[date].push(roomInfo);
          });
        } catch (error) {
          throw new Error(error);
        }
      })
    );

    // Store into database
    const tripData = await Trip.findById(tripId);
    if (tripData.bnbs) {
      tripData.bnbs[bnbId] = bnb;
    } else {
      tripData.bnbs = { [bnbId]: bnb };
    }
    await tripData.save();

    res.send(bnb);
  } catch (err) {
    res.status(500).send("Something went wrong!");
  }
});

app.listen(process.env.PORT || 3000, () => {
  const port = process.env.PORT || 3000;
  console.log("Server is running on port " + port);
});

module.exports = app;
