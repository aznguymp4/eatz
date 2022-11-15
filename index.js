const OCR = window.tesseract
const TPKAPI = 'https://tweetpik.com/api/tweets/'

const URLsGroup = document.getElementById('URLs')
const urlInputEle = document.getElementsByClassName('TextInputGroup')[0]
const autoPaste = document.getElementById('autoPaste')
const gameID = document.getElementById('gameID')
const codeblock = document.getElementById('codeBlock')
const cover = new Image()
cover.src = '../src/cover.png'

let charts = {};
['sbeg','sbas','sdif','sexp','scha','dbas','ddif','dexp','dcha'].map(d => {
	fetch(`./chartIDs/${d}.json`).then(dat=>{dat.json().then(json=>{ charts[d]=json })})
})

document.getElementById('urlAdd').addEventListener('click',e=>{
	let newInput = urlInputEle.cloneNode(true)
	let txtInput = newInput.getElementsByTagName('input')[0]
	URLsGroup.appendChild(newInput)
	txtInput.value = ''
	txtInput.select()
	txtInput.addEventListener('focusout',()=>{
		if(txtInput.value) return
		newInput.remove()
	})
	
	if(!autoPaste.checked) return
	navigator.clipboard.readText().then(text => {
		txtInput.value = text
	}).catch(console.log);

	//URLsGroup.innerHTML += urlInputEle.outerHTML
})

if(localStorage.autoPaste!=undefined) {autoPaste.checked = localStorage.autoPaste} else {localStorage.autoPaste = false}
autoPaste.addEventListener('change',()=>{localStorage.autoPaste = autoPaste.checked})

document.getElementById('start').addEventListener('click',()=>{
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
})


function zeniusify(inputElement,imgURL) {
	let img = new Image()
	img.crossOrigin='anonymous'
	img.onload=()=>{
		let cvs = document.createElement('canvas')
		let ctx = cvs.getContext('2d')
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
		processOCR(inputElement,cvs.toDataURL(),imgURL)
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
		let dat = {
			SongName: text.match(/(?<=song {0,}).{1,}/i)[0].trim(),
			Mode: /(?<=mode {0,})(D|d)/i.test(text)? 'd':'s', // if mode starts with D, it's doubles, else single/versus
			Difficulty: text.match(/(?<=difficulty) {0,}\w{1,3}/i)[0].trim().toLowerCase(),
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
			else if (/(bas|.as|b.s|ba.|^ba|s$)/.test(dat.Difficulty)) dat.Difficulty = 'bas'
			else if (/(dif|.if|d.f|di.|^d|f$)/.test(dat.Difficulty)) dat.Difficulty = 'dif'
			else if (/(exp|.xp|e.p|ex.|^e|p$)/.test(dat.Difficulty)) dat.Difficulty = 'exp'
			else if (/(cha|.ha|c.a|ch.|^c|a$)/.test(dat.Difficulty)) dat.Difficulty = 'cha'
		}
		['Marvelous','Perfect','Great','Good','OK','Miss'].map(j=>{dat.ChartStats.Judge[j] = parseInt(text.match(new RegExp(`(?<=${j} {0,})\\d{1,}`,'i'))) })
		dat.ChartStats.Steps = ['Marvelous','Perfect','Great','Good','Miss'].map(j=>{return dat.ChartStats.Judge[j]}).reduce((a,b)=>a+b,0)
		dat.ChartStats.Freeze = dat.ChartStats.Judge.OK // doesn't count N.G. (missed freeze arrows)
		generateCmd(dat)
	})
}

function searchChartID(dat) { // tries its best to find the chart ID with the info provided by the OCR
	return new Promise((res,err)=>{
		let list = charts[`${dat.Mode}${dat.Difficulty}`]
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
		`</div>fetch("https://zenius-i-vanisher.com/v5.2/ddrscoretracker_scoreentry.php", {"headers": {"content-type": "application/x-www-form-urlencoded"},"body": "submit=1&notechartid=${chart.NoteChartID}&difficulty=${ocrData.Mode}${ocrData.Difficulty}&gameid=${gameID.value}&marvelous=${j.Marvelous}&perfect=${j.Perfect}&great=${j.Great}&good=${j.Good}&almost=0&boo=${j.Miss}&ok=${j.OK}&speed=1.5x&boost=Off&appearance=Normal&turn=Normal&dark=Off&scroll=Normal&arrow=Note&other=&pictureid=&comment=${'Semi-automatically+uploaded+with+EATZ+(https%3A%2F%2Fgithub.com%2Faznguymp4%2Featz)'}&videolink=${encodeURIComponent(ocrData.URLEntered)}&pass=on&fullcombo=off","method": "POST"});<br><br>`]
		.join('<br>').replace(/&/g,'&amp;')
	}).catch(dat => {
		codeblock.innerHTML += `<div class="NaN">// Song unrecognized!<br>// <a target="_blank" href="${dat.ImgSrc}">${dat.ImgSrc}</a></div><br>`
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
		fetch(`https://aznbotmp4.herokuapp.com/IHujTBTn6qCqdvAm7eYiGOrYrDfmjry6?redir=${encodeURIComponent(`${TPKAPI}${tweetURL.match(/(?<=status\/)\d{1,}/)[0]}`)}`).then(a=>{
			a.json().then(b=>{
				res(b.media.map(media=>{return media.url }))
			}).catch(err)
		}).catch(err)
	})
}