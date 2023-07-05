const express = require('express');
const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const readability = require('@mozilla/readability');
const { PassThrough } = require('stream');

const DEFAULT_VIEWPORT = { width: 768, height: 1024, deviceScaleFactor: 1 };
const PAGE_GOTO_SETTINGS = { waitUntil: 'networkidle2' };

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
  const pipeStream = new PassThrough();
  const browser = await puppeteer.launch(defaultArgs);
  const page = await browser.newPage();
  const recorder = new PuppeteerScreenRecorder(page);

  try {
    await recorder.startStream(pipeStream);
    await page.setViewport(DEFAULT_VIEWPORT);
    await page.goto(req.query.url, PAGE_GOTO_SETTINGS);
    
    const body = await page.evaluate(() => {
      return document.querySelector("body").innerHTML;
    });
    const { document } = new JSDOM(body).window;
    const article = new readability.Readability(document).parse();

    await recorder.stop();

    const head = {
      'Content-Type': 'video/mp4',
      'Extracted-Text': Buffer.from(article.textContent).toString('base64')
    };
    res.writeHead(200, head);
    pipeStream.pipe(res);
  } catch(err) {
    console.log(err);
    res.send(err);
  } finally {
    await browser.close();
  }
});

const port = parseInt(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`scaipe: listening on port ${port}`);
});
