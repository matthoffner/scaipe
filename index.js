const express = require('express');
const app = express();
const puppeteer = require('puppeteer');
const fs = require('fs');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');

/*
const Config = {
  followNewTab: true,
  fps: 25,
  ffmpeg_Path: '<path of ffmpeg_path>' || null,
  videoFrame: {
    width: 1024,
    height: 768,
  },
  videoCrf: 18,
  videoCodec: 'libx264',
  videoPreset: 'ultrafast',
  videoBitrate: 1000,
  autopad: {
    color: 'black' | '#35A5FF',
  },
  aspectRatio: '4:3',
};
*/

app.get('/index.html', async (req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  const file = fs.createReadStream('index.html');
  file.pipe(res);
});

app.get('/scaipe', async (req, res) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const recorder = new PuppeteerScreenRecorder(page);
  const videoPath = `./${req.query.url.replace('https://', '')}.mp4`; 
  await recorder.start(videoPath);
  try {
    await page.goto(req.query.url);
    await recorder.stop();
    await browser.close();
  } catch (err) {
    res.send(err);
  }

  const videoStat = fs.statSync(videoPath);
  const fileSize = videoStat.size;
  const videoRange = req.headers.range;
  if (videoRange) {
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
          'Content-Type': 'video/mp4',
      };
      res.writeHead(206, header);
      file.pipe(res);
  } else {
      const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
  }
});

const port = parseInt(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`scaipe: listening on port ${port}`);
});