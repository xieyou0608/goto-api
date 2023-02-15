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
    const transformedBnbs = {};
    tripData.bnbs.map((bnb) => {
      const transformedRooms = {};
      bnb.rooms.map((room) => {
        const { date, roomsList } = room;
        transformedRooms[date] = roomsList;
      });

      const { bnbId, name, url } = bnb;
      transformedBnbs[bnbId] = {
        name,
        url,
        rooms: transformedRooms,
      };
    });

    const transformedMembers = {};
    tripData.members.map((member) => {
      const { username, datesVote } = member;
      const transformedDatesVote = {};
      datesVote.map((v) => {
        const { date, vote } = v;
        transformedDatesVote[date] = vote;
      });
      transformedMembers[username] = { datesVote: transformedDatesVote };
    });

    res.send({
      ...tripData._doc,
      bnbs: transformedBnbs,
      members: transformedMembers,
    });
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
    const datesVote = [];
    tripData.availableDates.forEach((date) => {
      datesVote.push({ date, vote: "" });
    });
    tripData.members.push({ username, datesVote });
    await tripData.save();

    // transform and send to frontend
    const transformedDatesVote = {};
    datesVote.map((v) => {
      const { date, vote } = v;
      transformedDatesVote[date] = vote;
    });
    res.send({ [username]: { datesVote: transformedDatesVote } });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

// user vote on dates
app.patch("/api/trip/:tripId/members/:username", async (req, res) => {
  const { tripId, username } = req.params;
  console.log(username);
  const { datesVote } = req.body;
  const transformedDatesVote = Object.keys(datesVote).map((date) => ({
    date,
    vote: datesVote[date],
  }));
  console.log(transformedDatesVote);

  try {
    const tripData = await Trip.findById(tripId);
    const idx = tripData.members.findIndex(
      (member) => member.username === username
    );
    console.log(idx);
    console.log(tripData.members);
    tripData.members[idx].datesVote = transformedDatesVote;
    await tripData.save();
    res.send("Successfully updated.");
  } catch (error) {
    console.log(error);
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
    const bnb = {
      bnbId,
      name: bnbName,
      url: bookingUrl,
      rooms: [],
    };

    // get bnb rooms
    await Promise.all(
      dates.map(async (date) => {
        const oneDayRoomsList = [];
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
            oneDayRoomsList.push(roomInfo);
          });
          bnb.rooms.push({ date, roomsList: oneDayRoomsList });
        } catch (error) {
          throw new Error(error);
        }
      })
    );

    // Store into database
    const tripData = await Trip.findById(tripId);
    tripData.bnbs.push(bnb);
    await tripData.save().catch((e) => {
      console.log(e);
    });

    // Transform data and send to frontend
    const transformedRooms = {};
    bnb.rooms.map((room) => {
      transformedRooms[room.date] = room.roomsList;
    });
    bnb.rooms = transformedRooms;

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
