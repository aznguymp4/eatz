const OCR = window.tesseract
const TPKAPI = 'https://tweetpik.com/api/tweets/'
const URLsGroup = document.getElementById('URLs')
const urlInputEle = document.getElementsByClassName('TextInputGroup')[0]
const autoPaste = document.getElementById('autoPaste')
const gameID = document.getElementById('gameID')
const codeblock = document.getElementById('codeBlock')
const [cover,coverOld] = [new Image(),new Image()]
cover.src = './src/cover.png'; coverOld.src = './src/cover_old.png'
const gameIDs = {
	'5518': 'A3',
	'5156': 'A20PLUS',
	'3802': 'A20',
	'2979': 'A',
	'1129': '2013_2014'
}
let charts = {};
for (const id in gameIDs) {
	let dir = gameIDs[id]
	charts[id] = {};
	['sbeg','sbas','sdif','sexp','scha','dbas','ddif','dexp','dcha'].map(d => {
		fetch(`./chartIDs/${dir}/${d}.json`).then(dat=>{dat.json().then(json=>{ charts[id][d]=json })})
	})
}

function urlAdd() {
	let newInput = urlInputEle.cloneNode(true)
	let txtInput = newInput.getElementsByTagName('input')[0]
	URLsGroup.appendChild(newInput)
	txtInput.value = ''
	txtInput.select()
	txtInput.addEventListener('focusout',()=>{
		if(txtInput.value) return
		txtInput.removeEventListener('focusout',()=>{})
		newInput.remove()
	})
	
	if(!autoPaste.checked) return
	navigator.clipboard.readText().then(text => {
		txtInput.value = text
	}).catch(console.log)

	//URLsGroup.innerHTML += urlInputEle.outerHTML
}

// autosave form
if(localStorage.autoPaste!=undefined) {autoPaste.checked = localStorage.autoPaste=='true'} else {localStorage.autoPaste = false}
if(localStorage.gameID!=undefined) {gameID.value = localStorage.gameID} else {localStorage.gameID = gameID.value}
autoPaste.addEventListener('change',()=>{localStorage.autoPaste = autoPaste.checked})
gameID.addEventListener('change',()=>{localStorage.gameID = gameID.value})

function start() {
	let urls = [].slice.call(document.getElementsByClassName('urlInput')).map(e=>{ return [e,e.value] })
	codeblock.textContent = ''
	urls.map(arr => {
		let url = arr[1]
		if(/twitter\.com/.test(url)) {
			getTweetImgs(url).then(imgs => {
				imgs.map(img => {zeniusify(arr[0],img)})
			})
		} else zeniusify(arr[0],url)
	})
}

function zeniusify(inputElement,imgURL) {
	let img = new Image()
	img.crossOrigin='anonymous'
	img.onload=()=>{
		let cvs = document.createElement('canvas')
		let ctx = cvs.getContext('2d')
		if(gameID.value=='1129') { // screenshot is in DDR 2013/2014 format
			cvs.width = 400; cvs.height = 600
			ctx.filter = 'contrast(400%) grayscale(100%)'
			ctx.drawImage(img,0,0,cvs.width,cvs.height)
			let titleCvs = document.createElement('canvas')
			let modeCvs = document.createElement('canvas')
			let diffCvs = document.createElement('canvas')
			let titleCtx = titleCvs.getContext('2d')
			let modeCtx = modeCvs.getContext('2d')
			let diffCtx = diffCvs.getContext('2d')
			titleCvs.width = cvs.width; titleCvs.height = cvs.height/2.5 // Get song name
			modeCvs.width = .16*cvs.width; modeCvs.height = (19/600)*cvs.height // Get chart mode (single/double)
			diffCvs.width = .25*cvs.width; diffCvs.height = (19/600)*cvs.height // Get difficulty
			titleCtx.drawImage(img,0,0,cvs.width,cvs.height)
			modeCtx.drawImage(img,(-13/400)*cvs.width,(-43/150)*cvs.height,cvs.width,cvs.height)
			diffCtx.drawImage(img,(-87/400)*cvs.width,(-43/150)*cvs.height,cvs.width,cvs.height)
			ctx.filter = 'invert(1) contrast(200%)'
			ctx.drawImage(titleCvs,0,0)
			ctx.filter = 'invert(0) contrast(100%)'
			ctx.drawImage(coverOld,0,0,cvs.width,cvs.height)
			ctx.filter = 'contrast(300%) grayscale(100%)'
			ctx.drawImage(modeCvs,208,490)
			ctx.drawImage(diffCvs,208,535)
		} else {  // screenshot is in DDR A format
			cvs.width = 930; cvs.height = 620
			ctx.filter = 'invert(1) contrast(200%)'
			ctx.drawImage(img,0,0,cvs.width,cvs.height)

			let titleCvs = document.createElement('canvas')
			let titleCtx = titleCvs.getContext('2d')
			titleCvs.width = cvs.width; titleCvs.height = cvs.width/7 // Only need to get the song name
			titleCtx.drawImage(img,0,0,cvs.width,cvs.height)

			ctx.filter = 'invert(0) grayscale(100%) contrast(100%)'
			ctx.drawImage(titleCvs,0,0)
			ctx.filter = 'invert(0)'
			ctx.drawImage(cover,0,0,cvs.width,cvs.height)
		}
		processOCR(inputElement,cvs.toDataURL(),imgURL)
	}
	img.onerror=(e)=>{
		codeblock.innerHTML += `<div class="NaN">// Could not fetch image!<br>// "${escapeHtml(imgURL)}"</div><br>`
	}
	img.src = imgURL
}

function processOCR(inputElement,imgURL,srcImg) {
	//window.open().document.write(`<img src="${imgURL}"></img>`)
	let group = inputElement.parentElement
	OCR.recognize(
		imgURL,
		'eng',
		{ logger: m => group.getElementsByClassName('progress')[0].textContent = `${Math.round(m.progress*100)}%` }
	).then(({ data: { text } }) => {
		console.log(text)
		let dat = {
			SongName: text.match(/(?<=song( |\n){0,}).{1,}/i)[0].trim(),
			Mode: /(?<=mode {0,})(D|d)/i.test(text)? 'd':'s', // if mode starts with D, it's doubles, else single/versus
			Difficulty: text.match(/(?<=difficulty) {0,}.{1,3}/i)[0].trim().toLowerCase(),
			URLEntered: inputElement.value,
			ImgSrc: srcImg,
			ChartStats: {
				Judge: {},
				Steps: 0,
				Freeze: 0
			}
		};
		if(!/(beg|bas|dif|exp|cha)/.test(dat.Difficulty)) { // difficulty does not match strict search, use fuzzy search 
				if (/(beg|.eg|b.g|be.|^be|g$)/.test(dat.Difficulty)) dat.Difficulty = 'beg'
			else if(/(bas|.as|b.s|ba.|^ba|s$)/.test(dat.Difficulty)) dat.Difficulty = 'bas'
			else if (/(dif|.if|d.f|di.|^d|f$)/.test(dat.Difficulty)) dat.Difficulty = 'dif'
			else if (/(exp|.xp|e.p|ex.|^e|p$)/.test(dat.Difficulty)) dat.Difficulty = 'exp'
			else if (/(cha|.ha|c.a|ch.|^c|a$)/.test(dat.Difficulty)) dat.Difficulty = 'cha'
		}
		['Marvelous','Perfect','Great','Good','OK','Miss'].map(j=>{dat.ChartStats.Judge[j] = parseInt(text.match(new RegExp(`(?<=${j} {0,})\\d{1,}`,'i'))) })
		dat.ChartStats.Steps = ['Marvelous','Perfect','Great','Good','Miss'].map(j=>{return dat.ChartStats.Judge[j]}).reduce((a,b)=>a+b,0)
		dat.ChartStats.Freeze = dat.ChartStats.Judge.OK // doesn't count N.G. (missed freeze arrows)
		console.log(dat)
		generateCmd(dat)
	})
}

function searchChartID(dat) { // tries its best to find the chart ID with the info provided by the OCR
	return new Promise((res,err)=>{
		let list = charts[gameID.value][`${dat.Mode}${dat.Difficulty}`]
		if(/(s|d)/.test(dat.Mode) && /(beg|bas|dif|exp|cha)/.test(dat.Difficulty)) { // song name missing (most common), find song using Steps and Freeze count
			for (const songName in list) { // strict Steps + Freeze search
				const chart = list[songName]
				if(chart.ChartStats.Steps !== dat.ChartStats.Steps) continue
				if(chart.ChartStats.Freeze !== dat.ChartStats.Freeze) continue
				return res(chart)
			}
			for (const songName in list) { // strict Steps, lenient Freeze search (OK + Misses <= Freezes?) 
				const chart = list[songName]
				if(chart.ChartStats.Steps !== dat.ChartStats.Steps) continue
				if(chart.ChartStats.Freeze !== dat.ChartStats.Freeze) {
					//if(!((dat.ChartStats.Freeze+dat.ChartStats.Judge.Miss) >= chart.ChartStats.Freeze)) continue
					if(chart.ChartStats.Freeze - dat.ChartStats.Freeze > dat.ChartStats.Judge.Miss) continue
					//console.log(songName, 'JKHAGSDJKHAHSKLD')
				}
			}
		}
		if(list[dat.SongName]) { // find with song name (not very reliable cause ocr dumb)
			return res(list[dat.SongName])
		}

		console.log('Unrecognized song: ', dat)
		return err(dat)
	})
}

function generateCmd(ocrData) {
	let j = ocrData.ChartStats.Judge
	searchChartID(ocrData).then(chart => {
		codeblock.innerHTML += [
		`<div class="${ocrData.Difficulty}">// ${chart.OriginalTitle}`,
		`// ${ocrData.Difficulty=='beg'?'b':(ocrData.Difficulty[0].toUpperCase())}${ocrData.Mode.toUpperCase()}P, Notes: ${chart.ChartStats.Steps}+${chart.ChartStats.Freeze}`,
		`</div>fetch("https://zenius-i-vanisher.com/v5.2/ddrscoretracker_scoreentry.php", {"headers": {"content-type": "application/x-www-form-urlencoded"},"body": "submit=1&notechartid=${chart.NoteChartID}&difficulty=${ocrData.Mode}${ocrData.Difficulty}&gameid=${gameID.value}&<span class="marvelous">marvelous</span>=<span class="marvelous">${j.Marvelous}</span>&<span class="perfect">perfect</span>=<span class="perfect">${j.Perfect}</span>&<span class="great">great</span>=<span class="great">${j.Great}</span>&<span class="good">good</span>=<span class="good">${j.Good}</span>&<span class="almost">almost</span>=<span class="almost">0</span>&<span class="miss">boo</span>=<span class="miss">${j.Miss}</span>&<span class="ok">ok</span>=<span class="ok">${j.OK}</span>&speed=1.5x&boost=Off&appearance=Normal&turn=Normal&dark=Off&scroll=Normal&arrow=Note&other=&pictureid=&comment=${'Semi-automatically+uploaded+with+EATZ+(https%3A%2F%2Fgithub.com%2Faznguymp4%2Featz)'}&videolink=${encodeURIComponent(ocrData.URLEntered)}&pass=on&fullcombo=off","method": "POST"});<br><br>`]
		.join('<br>').replace(/&/g,'&amp;')
	}).catch(dat => {
		codeblock.innerHTML += `<div class="NaN">// Song unrecognized!<br>// <a target="_blank" href="${dat.ImgSrc}">${escapeHtml(dat.ImgSrc)}</a></div><br>`
	})
}

function selectText(containerid) {
	if (document.selection) { // IE
		let range = document.body.createTextRange()
		range.moveToElementText(document.getElementById(containerid))
		range.select()
	} else if (window.getSelection) {
		let range = document.createRange()
		range.selectNode(document.getElementById(containerid))
		window.getSelection().removeAllRanges()
		window.getSelection().addRange(range)
	}
}

function getTweetImgs(tweetURL) {
	return new Promise((res,err) => {
		fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(`${TPKAPI}${tweetURL.match(/(?<=status\/)\d{1,}/)[0]}`)}`).then(a=>{
			a.json().then(b=>{
				res(b.media.map(media=>{return media.url }))
			}).catch(err)
		}).catch(err)
	})
}

function escapeHtml(unsafe) {
	// i hate this pls tell me there's a better way :(
	return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#039;");
}
/**
 * 
 * Run this code on the ZiV score tracker page to get the latest ChartID JSONs
 * 

let rows = document.getElementsByClassName('score')
let json = {}
for(let i=0;i<rows.length;i++){
    let row = rows[i]
    let id = parseInt(row.getAttribute('id').replace('score-',''))
    if(id<0) continue;
    let a = row.getElementsByTagName('a')[0]
    let stats = a.id.match(/\d{1,}-\d{1,}$/)[0].split('-')
    json[row.getAttribute('title')] = {
        NoteChartID: id,
        OriginalTitle: a.textContent,
        ChartStats: {
            Steps: parseInt(stats[0]),
            Freeze: parseInt(stats[1])
        }
    }
}
console.log(JSON.stringify(json))

*/
