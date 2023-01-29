import { twstayForm } from "./twstayForm.js";
import request from "request";
import cheerio from "cheerio";
// import fs from "fs";

let bnb_url = "https://twstay.com/RWD2/booking.aspx?BNB=shenzhou&OrderType=2";
let input_date = "2023/2/28";

const twstayCralwer = (inputUrl, inputDate) => {
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
        return;
      }
      if (!body) {
        console.log("No body found");
        return;
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
      console.log(data);
    }
  );
};

twstayCralwer(bnb_url, input_date);
