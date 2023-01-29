const express = require("express");
const cors = require("cors");
const { twstayCrawler } = require("./crawler");

const app = express();

// middelwares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// routes
app.get("/api", (req, res) => {
  res.send("It's api of goto-travel.");
});

app.post("/api/twstay", async (req, res) => {
  console.log("A request is coming into /twstay");
  const { bnb_url, date } = req.body;
  console.log(bnb_url, date);
  try {
    const data = await twstayCrawler(bnb_url, date);
    res.send(data);
  } catch (err) {
    res.status(500).send("Something went wrong!");
  }
});

app.listen(process.env.PORT || 8080, () => {
  console.log("Server is running.");
});

module.exports = app;
