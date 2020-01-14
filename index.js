const lighthouse = require("lighthouse");
const chromeLauncher = require("chrome-launcher");
const fs = require("fs");

function launchChromeAndRunLighthouse(url, opts, config = null) {
  return chromeLauncher
    .launch({ chromeFlags: opts.chrome.chromeFlags })
    .then(chrome => {
      console.log("Launching lighthouse for " + url);
      opts.lighthouse.port = chrome.port;
      return lighthouse(url, opts.lighthouse, config).then(res => {
        console.log("Parsing report for " + url);
        return chrome.kill().then(() => res.report);
      });
    });
}

function asyncLaunchChromeAndRunLighthouse(url, opts, config = null) {
  return new Promise((resolve, reject) => {
    return chromeLauncher
      .launch({ chromeFlags: opts.chrome.chromeFlags })
      .then(chrome => {
        console.log("Launching lighthouse for " + url);
        opts.lighthouse.port = chrome.port;
        return lighthouse(url, opts.lighthouse, config).then(res => {
          console.log("Killing chrome report for " + url);
          return chrome.kill().then(() => {
            console.log("Parsing report for " + url);
            resolve(res.report);
          });
        });
      });
  });
}

(async function() {
  const opts = {
    chrome: {
      chromeFlags: ["--headless", "--disable-gpu", "--no-sandbox"]
    },
    lighthouse: {
      chromePath: "/usr/bin/chromium",
      output: "html"
    }
  };

  const targets = {
    qa: {
      domain: "",
      pages: []
    },
    prod: {
      domain: "",
      pages: []
    }
  };

  const env = "prod";
  const domain = targets[env].domain;
  const pages = targets[env].pages;

  const today = new Date();
  for (let count = 0; count < pages.length; count++) {
    try {
      const address = pages[count];
      console.log("Starting analysis on " + address);
      const results = await asyncLaunchChromeAndRunLighthouse(
        `${domain}/${address}`,
        opts
      );
      const file = `${(address === "" ? "root" : address)
        .replace(/_/g, "-")
        .replace(/\//g, "-")
        .substring(0, 50)}.${opts.lighthouse.output}`;
      const folder = `output/${today.getFullYear()}/${today.getMonth() +
        1}/${today.getTime()}/${env}/`;
      const dest = `${folder}${file}`;
      console.log("Writing analysis to " + dest);
      fs.mkdir(folder, { recursive: true }, err => {
        if (err) {
          console.log(`mkdir: ${err}`);
        } else {
          fs.writeFile(dest, results, err => {
            if (err) {
              console.log(`writeFile: ${err}`);
            } else {
              console.log("Analysis saved to " + dest);
            }
          });
        }
      });
    } catch (error) {
      console.log(`analysis error: ${error} for ${address}`);
    }
  }
})();
