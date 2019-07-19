const puppeteer = require('puppeteer');
var fetchVideoInfo = require('youtube-info');
const inquirer = require('inquirer');
let serviceAccount = require('./library-pi.json');
var admin = require("firebase-admin");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://library-pi-8b021.firebaseio.com"
  });
var temp = require("pi-temperature");
var datetime = require('node-datetime');
let db = admin.firestore();
let tempRef = db.collection('temperatures').doc('temps');
const CRX_PATH = '/home/pi/h264ify';
//Should be true in production
const pi = true;
var os = require('os-utils');

(async () => {

var fullScreenYet = false

    var questions = [{
        name:"link",
        default:"https://docs.google.com/presentation/d/e/2PACX-1vRAGVJsh2vJkXe6fs0WHGKZveHICMFNnAnPJp4VARQZKlsJPmlKRb_41MobG2tbR0OhzWpNdxIbPGW5/pub?start=true&loop=true&delayms=60000",
        message:"Link to Google Slides presentation (make sure it is published)"
    },
    {
        name:"delay",
        default:'9.5',
        message:"delay for static pages (s)"
    }]
      
      var params = await inquirer.prompt(questions)
      

    let broswerParams = {
        //args: ['--disable-infobars'],
        headless: false,
        defaultViewport: null,
	    //executablePath: '/usr/bin/chromium-browser'
        //executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
      }
      if(pi){
        broswerParams = {
            //args: ['--disable-infobars'],
		/*args: [
			`--disable-extensions-except=${CRX_PATH}`,
    			`--load-extension=${CRX_PATH}`
		],*/
            headless: false,
            defaultViewport: null,
            executablePath: '/usr/bin/chromium-browser',
            //executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
          }
      }
    const browser = await puppeteer.launch(broswerParams);
    const page = await browser.newPage();
    //await page.setViewport({ width: 1920, height: 926 });
    await page.goto(params["link"],{timeout:120000, waitUntil:"networkidle2"});
    /*await page.keyboard.down('Control');
    await page.keyboard.down('Shift');
    await page.keyboard.press('KeyF');*/
    while(1){
        await page.waitFor(500)
        var vid = await page.evaluate(()=>document.getElementsByTagName("iframe").length>0 && document.getElementsByTagName("iframe")[document.getElementsByTagName("iframe").length-1].parentElement.parentElement.style.display != "none")
        if(vid){
            var url = await page.evaluate(()=>document.getElementsByTagName("iframe")[document.getElementsByTagName("iframe").length-1].src)
            var info = await fetchVideoInfo(YouTubeGetID(url))
            console.log("Video: "+info.duration)
            await page.waitFor(info.duration*1000)
        }else{
            var delay = 9.5*1000;
            if(Number(params["delay"]))
                delay = Number(params["delay"])*1000
            await page.waitFor(delay)
        }
	if(fullScreenYet){
		try{
			await page.evaluate(()=>document.querySelector('[title="Full screen (Ctrl+Shift+F)"]').title="")		
			await page.click('div[class="punch-viewer-icon punch-viewer-full-screen goog-inline-block"]')
		}catch(e){
			//console.log("No full screen btn (not really an error don't freak out)")
		}
    }
    /*tempRef.update({
        temps: admin.firestore.FieldValue.arrayUnion({temp:Math.random()*50+20,timestamp:new Date().getTime()})
    });*/
	    
	    var slideNum = await page.evaluate(()=>{
		    if(document.getElementsByClassName("goog-inline-block goog-flat-menu-button-caption").length>0)
		    	return document.getElementsByClassName("goog-inline-block goog-flat-menu-button-caption")[0].innerText
		return "Slide Number Not Found"
	    })
	    
        logToFirebase(slideNum)

        await page.keyboard.press('Space');
        //await page.click('div[title="Next (→)"]')

        var lastSlide = await page.evaluate(()=>{
            for(el of document.getElementsByClassName("goog-inline-block goog-flat-button")){
                if(el.title == "Next (→)"){
                    return el.classList.contains("goog-flat-button-disabled")
                }
            }
        })
        if(lastSlide){
	        fullScreenYet=true
            logToFirebase("Refreshing Slides")
                //await page.click('div[title="Play"]')
            await page.goto(params["link"],{timeout:120000,waitUntil:"networkidle2"});
    await page.evaluate(()=>document.querySelector('[title="Full screen (Ctrl+Shift+F)"]').title="")
    await page.click('div[class="punch-viewer-icon punch-viewer-full-screen goog-inline-block"]')
                    logToFirebase("Clicking Full Screen")
               /* await page.keyboard.down('Control');
            await page.keyboard.down('Shift');
            await page.keyboard.press('KeyF'); */
        }
    }
    
})();

function YouTubeGetID(url){
    var ID = '';
    url = url.replace(/(>|<)/gi,'').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    if(url[2] !== undefined) {
      ID = url[2].split(/[^0-9a-z_\-]/i);
      ID = ID[0];
    }
    else {
      ID = url;
    }
      return ID;
  }

  function logToFirebase(status){
    if(pi){
        temp.measure(function(err, temp) {
            if (err){
                console.log(err);
            }else{
                console.log("It's " + temp + " celsius.");
		    os.cpuUsage(function(v){
			    console.log( 'CPU Usage (%): ' + v );
			          tempRef.update({
				     temps: admin.firestore.FieldValue.arrayUnion({temp:temp,timestamp:new Date().getTime(),status:status,cpu:v,mem:os.freemem()/os.totalmem()})
				});
			});
            } 
        });
    }
  }