const puppeteer = require('puppeteer');
var fetchVideoInfo = require('youtube-info');
const inquirer = require('inquirer');

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
      


    const browser = await puppeteer.launch({
        //args: ['--disable-infobars'],
        headless: false,
        defaultViewport: null,
	//executablePath: '/usr/bin/chromium-browser'
        //executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
      });
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
            console.log(info.duration)
            await page.waitFor(info.duration*1000)
        }else{
            var delay = 9.5*1000;
            if(Number(params["delay"]))
                delay = Number(params["delay"])*1000
            await page.waitFor(delay)
        }
	if(fullScreenYet){
		try{
			await page.click('div[title="Full screen (Ctrl+Shift+F)"]')
		}catch(e){
			//console.log("No full screen btn (not really an error don't freak out)")
		}
	}
        await page.keyboard.press('Space');
        var lastSlide = await page.evaluate(()=>{
            for(el of document.getElementsByClassName("goog-inline-block goog-flat-button")){
                if(el.title == "Next (→)"){
                    return el.classList.contains("goog-flat-button-disabled")
                }
            }
        })
        if(lastSlide){
	fullScreenYet=true
                //await page.click('div[title="Play"]')
            await page.goto(params["link"],{timeout:120000,waitUntil:"networkidle2"});
    await page.click('div[title="Full screen (Ctrl+Shift+F)"]')
    await page.evaluate(()=>document.querySelector('[title="Exit full screen (Ctrl+Shift+F)"]').title="")
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
