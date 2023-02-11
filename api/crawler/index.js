const twstayForm = require("./twstayForm");
const request = require("request");
const cheerio = require("cheerio");
// const fs = require("fs");

const twstayBnbNameGetter = (inputUrl) =>
  new Promise((resolve, reject) => {
    request({ url: inputUrl, method: "GET" }, (error, res, body) => {
      if (error) {
        console.log(error);
        reject(error);
      }
      if (!body) {
        console.log(error);
        reject(error);
      }
      // fs.writeFileSync("getResult.html", body);

      const $ = cheerio.load(body);
      const title = $("title").text();
      const bnbName = title
        .replace("宜蘭民宿", "")
        .replace("- 線上訂房", "")
        .trim();
      resolve(bnbName);
    });
  });

// inputDate format: "yyyy/mm/dd"
const twstayCrawler = (inputUrl, inputDate) =>
  new Promise((resolve, reject) => {
    request(
      {
        url: inputUrl,
        method: "POST",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
        },
        form: {
          ctl00$ContentPlaceHolder1$txtDate: inputDate,
          ...twstayForm,
        },
      },
      (error, res, body) => {
        if (error) {
          console.log(error);
          reject(error);
        }
        if (!body) {
          console.log("No body found");
          reject(error);
        }
        // fs.writeFileSync("response_body.html", body);

        const data = [];
        const $ = cheerio.load(body);
        const trList = $(
          "#ctl00_ContentPlaceHolder1_gvOrder .GridviewScrollItem"
        );
        for (let i = 0; i < trList.length; i++) {
          const tr = trList.eq(i);
          const roomTitle = tr.find("a").text();
          const td = tr.find("td").eq(3); // 要爬取的日期會在第四個 td
          const hasNoRoom = td.find(".bgDRed").text(); // 如果沒房間會顯示 "滿"，有房間的話這格是 ""
          const roomPrice = td.find(".spanPrice").text(); // 價格
          const roomRemain = td.find(".bgDBlue").text(); // 空房數量

          data.push({ roomTitle, hasNoRoom, roomPrice, roomRemain });
        }
        resolve(data);
      }
    );
  });

const testNameGetter = async () => {
  let bnb_url = "https://twstay.com/RWD2/index.aspx?bnb=memorycastle";
  let booking_url = bnb_url.replace("index", "booking");

  try {
    const bnbName = await twStayBnbNameGetter(booking_url);
    console.log(bnbName);
  } catch (error) {
    console.log(error);
  }
};

const testCrawler = async () => {
  let input_date = "2023/2/28";
  let bnb_url = "https://twstay.com/RWD2/index.aspx?bnb=memorycastle";
  let booking_url = bnb_url.replace("index", "booking");

  try {
    const res = await twstayCrawler(booking_url, input_date);
    console.log(res);
  } catch (error) {
    console.log(error);
  }
};

// testNameGetter()
// testCrawler();

module.exports = { twstayBnbNameGetter, twstayCrawler };
