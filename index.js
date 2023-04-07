const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const readability = require('@mozilla/readability');
// const Dalai = require('dalai');
const { homedir } = require('os');


// const dalai = new Dalai('/root/dalai/alpaca/main.cpp');

const app = express();

var isMac = process.platform === "darwin";
const defaultArgs = isMac ? {} : { 
  executablePath: '/usr/bin/google-chrome',
  headless: true, args: 
    ['--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--no-first-run',
    '--no-sandbox',
    '--no-zygote',
    '--single-process',
    "--proxy-server='direct://'",
    '--proxy-bypass-list=*',
    '--deterministic-fetch'
  ] 
};

app.get('/index.html', async (req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  const file = fs.createReadStream('index.html');
  file.pipe(res);
});

app.get('/scaipe', async (req, res) => {
  const browser = await puppeteer.launch(defaultArgs);
  const page = await browser.newPage();
  const recorder = new PuppeteerScreenRecorder(page);
  const videoPath = `./${req.query.url.replace('https://', '').replaceAll('/', '')}.mp4`; 
  
  await recorder.start(videoPath);
  try {
    await page.setViewport({
      width: 768,
      height: 1024,
      deviceScaleFactor: 1,
    });
    await page.goto(req.query.url, { waitUntil: 'networkidle2' });
    // await page.waitForFunction(() => document.readyState === "complete");
  } catch (err) {
    console.log(err);
    res.send(err);
    return;
  }
  let videoStat;
  let fileSize;
  try {
    videoStat = fs.statSync(videoPath);
    fileSize = videoStat.size;
  } catch (err) {
    fs.closeSync(fs.openSync(videoPath, 'a'))
  }
  const videoRange = req.headers.range;
  if (videoRange && fileSize) {
      const parts = videoRange.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1]
          ? parseInt(parts[1], 10)
          : fileSize-1;
      const chunksize = (end-start) + 1;
      const file = fs.createReadStream(videoPath, {start, end});
      const header = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4'
      };
      res.writeHead(206, header);
      file.pipe(res);
  } else {
      const body = await page.evaluate(() => {
        return document.querySelector("body").innerHTML;
      });
      const { document } = new JSDOM(body).window;
      const article = new readability.Readability(document).parse();
      await recorder.stop();
      await browser.close();
      updatedFile = fs.statSync(videoPath);
      

      const head = {
          'Content-Length': updatedFile.size,
          'Content-Type': 'video/mp4',
          'Extracted-Text': Buffer.from(article.textContent).toString('base64')
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
  }
});

const port = parseInt(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`scaipe: listening on port ${port}`);
});
