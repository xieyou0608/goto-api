const express = require("express");
const cors = require("cors");
const { twstayBnbNameGetter, twstayCrawler } = require("./crawler");

const app = express();

// middelwares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// routes
app.get("/api", (req, res) => {
  res.send("It's api of goto-travel.");
});

app.post("/api/twstay/:bnbId/rooms", async (req, res) => {
  const { bnbId } = req.params;
  const { dates } = req.body;
  console.log(`Request available rooms of ${bnbId}`);
  const bookingUrl = "https://twstay.com/RWD2/booking.aspx?BNB=" + bnbId;
  const bnb = {};
  bnb.url = bookingUrl;
  bnb.rooms = {};
  try {
    // get bnb name
    const bnbName = await twstayBnbNameGetter(bookingUrl);
    bnb.name = bnbName;

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

    // TODO: store into database

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
