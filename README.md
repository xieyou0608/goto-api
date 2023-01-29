# Goto API
主要為開發民宿爬蟲使用，目標是給予一間民宿的網址跟特定日期，爬取該天是否有空房

## Tech Stack
- Nodejs
- request, cheerio
- Express.js
- Vercel

## Booking
以 request 套件 GET HTML後用 cheerio 解析 body  
拿到的 HTML 檔案跟直接在 chrome 用開發人員工具查看有差異  
所以用 table 去搜尋會抓不到東西  
原本以為是用 AJAX 處理，但去 Network 看 xhr 沒有找到相關資訊(倒是看到評論是用 xhr 處理)  
而且重新整理之後會看到一開始空房情況就已經渲染好了，並沒有額外的 AJAX  
後來從 POSTMAN 直接打，看了一下 HTML 之後，確實已經包含空房資料  
長的也像是瀏覽器上看到的 HTML，可能要研究怎麼模擬 POSTMAN 打 request  

## 樂活宜蘭民宿
這個訂房的頁面是台灣宿配網提供的  
https://twstay.com/RWD2/booking.aspx?BNB=morningbnb&OrderType=2 
研究之後發現網頁是用 AJAX 做 CSR，所以直接 GET 沒有辦法取得訂房資訊  
直接 GET 拿到的 HTML 可以看到是由很多 input type="hidden" 的標籤組成一個超大表單  
查看 Network 後發現是用 POST 來取得資訊，而且 response 是一整個頁面  
Network 裡也顯示很多表單的 key value，而且有非常多是亂碼  
看起來是 GET 到 HTML 後會再 POST 那些 hidden input 來取得空房，不太確定為甚麼要這樣  

一開始嘗試 headers 設置 user-agent 是瀏覽器，加上只填幾項有意義的欄位(像是BNBID跟Date)都沒辦法取得想要的頁面  
最後發現直接把 Network 裡的表單資料全部複製下來打 POST 就可以了   
而且如果不設置 user-agent 會打不到東西，看起來是有做一些保護措施  

另外，反覆嘗試拿掉表單的其中幾個值後，發現必須附帶的應該就是底線開頭的資訊(如 __EVENTVALIDATION)  
若這個資訊是有時效的，可以改成先打一次 GET 拿 form 的資訊，然後再打 POST 拿真正需要的東西(就像網站做的事)  
否則的話只需要把 txtDate 設成變數即可模組化，也不用先打 GET  

#### response
成功打到之後看了一下，如果是以日期查詢來爬蟲  
拿到的 body 會看到有 6 個日期，然後查詢的日期在第 3 個  
蠻困惑的，感覺要是包含那天的那個禮拜 7 天之類，但先暫時就這樣用  
API 初步設計成只抓一天(當然可以的話最好是先計算好怎麼用最少的請求拿到最多日期)  

## 小記
以上一連串嘗試大概花了 3 個小時  
但學到了怎麼從 Network 看 XHR 的運作，以及模擬發送請求  
成功打到樂活之後暫時先不研究 Booking.com，先嘗試寫成 API

## API
使用 Express.js 開發後 deploy 到 Vercel 上  
#####　GET /api
單純測試 server 狀況
```
It's api of goto-travel.
```

##### POST /api/twstay
request body: (台灣宿配網訂房頁面的網址及要查詢的日期)
```js
{
    bnb_url: "https://twstay.com/RWD2/booking.aspx?BNB=shenzhou&OrderType=2",
    date: "2023/2/28"
}
```
response data: (可使用 hasNoRoom 檢查是否有空房可訂)
```js
[
    {
        "roomTitle": "4~8人包棟(二房)",
        "hasNoRoom": "",
        "roomPrice": "15000",
        "roomRemain": "1"
    },
    {
        "roomTitle": "6~10人包棟(三房)",
        "hasNoRoom": "滿",
        "roomPrice": "",
        "roomRemain": ""
    }
]
```


## Ref
[Using Express.js with Vercel](https://vercel.com/guides/using-express-with-vercel)  
在 Vercel 部署 Express 的話似乎必須模仿在 Next.js 裡的 api 結構  
把 index.js 放在 api folder 裡，然後 routes 要設定 /api 開頭  
