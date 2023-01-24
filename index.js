const OCR = window.tesseract
const TPKAPI = 'https://tweetpik.com/api/tweets/'
const filesGroup = document.getElementById('files')
const urlInputEle = document.getElementsByClassName('TextInputGroup')[0]
const fileInputEle = document.getElementsByClassName('FileInputGroup')[0]
const loadingBar = document.getElementById('loadingBar').style
const startBtn = document.getElementById('start')
const filePick = document.getElementById('fileUpl')
const autoPaste = document.getElementById('autoPaste')
const gameID = document.getElementById('gameID')
const codeblock = document.getElementById('codeBlock')
const [cover,coverOld] = [new Image(),new Image()]
cover.src = './src/cover.png'; coverOld.src = './src/cover_old.png'
let fileUploadJS; fetch(`./fileUpload.js`).then(dat=>{dat.text().then(text=>{fileUploadJS = text})})
let running = 0
let [OCRqueue,OCRmax] = [0,((performance.memory.jsHeapSizeLimit.toString()[0]-0)*1.5) || 4]
let progressSum = []
let fileScores = {}
let charts = {}
const gameIDs = {
	'5518': 'A3',
	'5156': 'A20PLUS',
	'3802': 'A20',
	'2979': 'A',
	'1129': '2013_2014'
}
for (const id in gameIDs) {
	let dir = gameIDs[id]
	charts[id] = {};
	['sbeg','sbas','sdif','sexp','scha','dbas','ddif','dexp','dcha'].map(d => {
		fetch(`./chartIDs/${dir}/${d}.json`).then(dat=>{dat.json().then(json=>{ charts[id][d]=json })})
	})
}
document.getElementsByClassName('TextInputGroup')[0].remove()
document.getElementsByClassName('FileInputGroup')[0].remove()

function urlAdd() {
	let newInput = urlInputEle.cloneNode(true)
	let txtInput = newInput.getElementsByTagName('input')[0]
	filesGroup.appendChild(newInput)
	txtInput.value = ''
	txtInput.select()
	newInput.getElementsByClassName('removeBtn')[0].addEventListener('click', ()=>{newInput.remove()})
	
	if(!autoPaste.checked) return
	navigator.clipboard.readText().then(text => {
		txtInput.value = text
	})
}

filePick.addEventListener('input',()=>{
	Array.from(document.getElementsByClassName('FileInputGroup')).map(ipt => ipt.remove())
	Array.from(filePick.files).map(file => {
		let newInput = fileInputEle.cloneNode(true)
		let fileNameEle = newInput.getElementsByClassName('fileName')[0]
		fileNameEle.textContent = file.name
		newInput.getElementsByClassName('removeBtn')[0].addEventListener('click', ()=>{newInput.remove()})

		let reader = new FileReader()
		reader.onload=e=>{
			renderSongIcon(newInput.getElementsByTagName('canvas')[0], e.target.result, file, fileNameEle)
		}
		reader.readAsDataURL(file)

		filesGroup.appendChild(newInput)
	})
})

// autosave form
if(localStorage.autoPaste!=undefined) {autoPaste.checked = localStorage.autoPaste=='true'} else {localStorage.autoPaste = false}
if(localStorage.gameID!=undefined) {gameID.value = localStorage.gameID} else {localStorage.gameID = gameID.value}
autoPaste.addEventListener('change',()=>{localStorage.autoPaste = autoPaste.checked})
gameID.addEventListener('change',()=>{localStorage.gameID = gameID.value})

function renderSongIcon(cvs, src, file, fileNameEle) {
	let img = new Image()
	let ctx = cvs.getContext('2d')
	img.onload=()=>{
		if(img.width>img.height) { // DDR A format
			cvs.width = img.width*.2 // 120px/600px
			cvs.height = cvs.width
			ctx.drawImage(img, img.width*(-19/600), img.height*(-17/400))
		} else { // DDR 2014 format
			cvs.width = img.width*.3 // 120px/400px
			cvs.height = cvs.width
			ctx.drawImage(img, img.width*(-27/400), img.height*(-17/200))
		}
	}; img.src = src
	if(fileNameEle) {
		fileNameEle.SRC_ATTR = src
		fileNameEle.FILE_ATTR = file
	}
}

function start() {
	let urls = []
	Array.from(document.getElementsByClassName('urlInput')).map(e=>{return urls.push([e,e.value])})
	Array.from(document.getElementsByClassName('fileName')).map(f=>{return urls.push([f,f.SRC_ATTR])})

	if(!urls.length) return codeblock.innerHTML = '<div class="dif">// Please attach images to generate a command!</div>'
	if(running) return; running = urls.length
	progressSum = Array(urls.length).fill(0)
	startBtn.textContent = 'Running...'
	codeblock.textContent = ''
	codeblock.FILEUPLOADPREPARED = false
	Array.from(document.querySelectorAll('.urlInputThumbList')).map(li=>{
		Array.from(li.querySelectorAll('canvas')).map((cvs,idx)=>{
			if(idx) cvs.remove()
			else cvs.classList.remove('usedThumb')
		})
	})
	urls.map((arr,idx) => {
		let url = arr[1]
		if(/twitter\.com/.test(url)) {
			running--
			getTweetImgs(url).then(imgs => {
				arr[0].INDEX = idx
				arr[0].style = `margin-bottom:${(61*(imgs.length-1))+24}px`
				imgs.map(img => {
					running++
					zeniusify(arr[0],img,true)
				})
			})
		} else {
			zeniusify(arr[0],url)
			arr[0].INDEX = idx
		}
	})
}

function zeniusify(inputElement,imgURL) {
	let img = new Image()
	img.crossOrigin='anonymous'
	img.onload=()=>{
		renderSongIcon(inputElement.parentElement.getElementsByTagName('canvas')[0], imgURL)

		let cvs = document.createElement('canvas')
		let ctx = cvs.getContext('2d')
		if(img.height>img.width) { // screenshot is in DDR 2013/2014 format
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
	img.onerror=()=>{
		running--
		if(!running) startBtn.textContent = 'Generate'
		codeblock.innerHTML += `<div class="command"><div class="NaN">// Could not fetch image!<br>// It's possible that the image URL doesn't return a usable <a class="viewUnrecognizedFile" target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS">CORS header</a>.<br>// <a class="viewUnrecognizedFile" target="_blank" href="${imgURL}">${escapeHtml(imgURL)}</a></a></div></div>`
	}
	img.src = imgURL
}

function processOCR(inputElement,imgURL,srcImg) {
	//window.open().document.write(`<img src="${imgURL}"></img>`)
	let percent = inputElement.parentElement.getElementsByClassName('progress')[0]
	percent.textContent = 'Waiting...'
	function wait() {
		if(OCRqueue>=OCRmax) {
			setTimeout(wait,500)
		} else {
			OCRqueue++
			startOCR()
		}
	} wait()
	function startOCR() {
		OCR.recognize(
			imgURL, 'eng', { logger: m => {
				const progress = m.status=='recognizing text'?Math.round(m.progress*100):0
				progressSum[inputElement.INDEX] = progress
				percent.textContent = progress+'%'
				loadingBar.width = progressSum.reduce((b,a)=>b+a,0)/(progressSum.length)+'%'
			}
		}).then(({ data: { text } }) => {
			OCRqueue--;
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
				if (/(beg|.eg|b.g|be.|.e.|^be|g$)/.test(dat.Difficulty)) dat.Difficulty = 'beg'
				else if(/(bas|.as|b.s|ba.|.a.|^ba|s$)/.test(dat.Difficulty)) dat.Difficulty = 'bas'
				else if (/(dif|.if|d.f|di.|.i.|^d|f$)/.test(dat.Difficulty)) dat.Difficulty = 'dif'
				else if (/(exp|.xp|e.p|ex.|.x.|^e|p$)/.test(dat.Difficulty)) dat.Difficulty = 'exp'
				else if (/(cha|.ha|c.a|ch.|.h.|^c|a$)/.test(dat.Difficulty)) dat.Difficulty = 'cha'
			}
			['Marvelous','Perfect','Great','Good','OK','Miss'].map(j=>{dat.ChartStats.Judge[j] = parseInt(text.match(new RegExp(`(?<=${j} {0,})\\d{1,}`,'i'))) })
			dat.ChartStats.Steps = ['Marvelous','Perfect','Great','Good','Miss'].map(j=>{return dat.ChartStats.Judge[j]}).reduce((a,b)=>a+b,0)
			dat.ChartStats.Freeze = dat.ChartStats.Judge.OK // doesn't count N.G. (missed freeze arrows)
			
			let j = dat.ChartStats.Judge
			searchChartID(dat).then(chart => {
				inputElement.parentElement.parentElement.appendChild(inputElement.parentElement)
				percent.textContent = '✅ 100%'
				if(dat.URLEntered) { // Image/Tweet URL
					codeblock.innerHTML += [
						`<div class="command"><div class="${dat.Difficulty}">// ${chart.OriginalTitle}`,
						`// ${dat.Difficulty=='beg'?'b':(dat.Difficulty[0].toUpperCase())}${dat.Mode.toUpperCase()}P, Notes: ${chart.ChartStats.Steps}+${chart.ChartStats.Freeze}`,
					`</div>fetch("https://zenius-i-vanisher.com/v5.2/ddrscoretracker_scoreentry.php",{"headers":{"content-type":"application/x-www-form-urlencoded"},"body":"submit=1&notechartid=${chart.NoteChartID}&difficulty=${dat.Mode}${dat.Difficulty}&gameid=${gameID.value}&<span class="marvelous">marvelous</span>=<span class="marvelous">${j.Marvelous}</span>&<span class="perfect">perfect</span>=<span class="perfect">${j.Perfect}</span>&<span class="great">great</span>=<span class="great">${j.Great}</span>&<span class="good">good</span>=<span class="good">${j.Good}</span>&<span class="almost">almost</span>=<span class="almost">0</span>&<span class="miss">boo</span>=<span class="miss">${j.Miss}</span>&<span class="ok">ok</span>=<span class="ok">${j.OK}</span>&speed=1.5x&boost=Off&appearance=Normal&turn=Normal&dark=Off&scroll=Normal&arrow=Note&other=&pictureid=&comment=${'Semi-automatically+uploaded+with+EATZ+(https%3A%2F%2Fgithub.com%2Faznguymp4%2Featz)'}&videolink=${encodeURIComponent(dat.URLEntered)}&pass=on&fullcombo=${j.Miss?'off':'on'}","method":"POST"});<br><br></div>`]
					.join('<br>').replace(/&/g,'&amp;')

					let freeCvs = inputElement.parentElement.querySelector('.urlInputThumb:not(.usedThumb)')
					if(freeCvs) {
						renderSongIcon(freeCvs, srcImg)
						freeCvs.classList.add('usedThumb')
					} else {
						let newCvs = inputElement.parentElement.querySelector('canvas').cloneNode()
						newCvs.classList.add('usedThumb')
						inputElement.parentElement.querySelector('.urlInputThumbList').appendChild(newCvs)
						renderSongIcon(newCvs, srcImg)
					}
				} else { // Image File
					const file = inputElement.FILE_ATTR
					fileScores[`${file.name}/${file.size}`] = {
						cont: {'headers':{'content-type':'application/x-www-form-urlencoded'},'body':`submit=1&notechartid=${chart.NoteChartID}&difficulty=${dat.Mode}${dat.Difficulty}&gameid=${gameID.value}&marvelous=${j.Marvelous}&perfect=${j.Perfect}&great=${j.Great}&good=${j.Good}&almost=0&boo=${j.Miss}&ok=${j.OK}&speed=1.5x&boost=Off&appearance=Normal&turn=Normal&dark=Off&scroll=Normal&arrow=Note&other=&pictureid=12345&comment=Semi-automatically+uploaded+with+EATZ+(https%3A%2F%2Fgithub.com%2Faznguymp4%2Featz)&videolink=&pass=on&fullcombo=${j.Miss?'off':'on'}`,'method':'POST'},
						song: {
							diff: dat.Difficulty,
							mode: dat.Mode,
							info: chart
						}
					}
					codeblock.innerHTML += [
					`<div class="command"><span class="${dat.Difficulty}">// ${chart.OriginalTitle}`,
					`// ${dat.Difficulty=='beg'?'b':(dat.Difficulty[0].toUpperCase())}${dat.Mode.toUpperCase()}P, Notes: ${chart.ChartStats.Steps}+${chart.ChartStats.Freeze}</span>`,
					`// ${`<button class="viewUnrecognizedFile" onclick=\"window.open().document.write('<title>EATZ - Image File</title><img src=\\'${dat.ImgSrc}\\'></img>')\">Image</button>`} is an uploaded file, paste the command in Zenius to proceed to the next step.`]
					.join('<br>').replace(/&/g,'&amp;')
				}
			}).catch(e => {
				inputElement.parentElement.parentElement.prepend(inputElement.parentElement)
				percent.textContent = '❌ Unrecognized!'
				codeblock.innerHTML = `<div class="command"><div class="NaN">// Song unrecognized!<br>// You may have to submit the score manually. 😞<br>// ${dat.ImgSrc.toString().startsWith('data:image')? `<button class="viewUnrecognizedFile" onclick=\"window.open().document.write('<title>EATZ - Unrecognized Song</title><img src=\\'${dat.ImgSrc}\\'></img>')\">View Image</button>` : `<a class="viewUnrecognizedFile" target="_blank" href="${dat.ImgSrc}">${escapeHtml(dat.ImgSrc)}</a>`}</div></div>` + codeblock.innerHTML
			}).finally(()=>{
				running--;
				if(!running) { // done scanning all imgs
					startBtn.textContent = 'Generate'
					if(!Object.keys(fileScores).length) return
					codeblock.innerHTML += escapeHtml(fileUploadJS.replace(`{'place':'holder'}`,JSON.stringify(fileScores)))
					fileScores = {}
				}
			})
		})
	}
}

function searchChartID(dat) { // tries its best to find the chart ID with the info provided by the OCR
	return new Promise((res,err)=>{
		let list = charts[gameID.value][`${dat.Mode}${dat.Difficulty}`]
		let asdf = /(s|d)/.test(dat.Mode) && /(beg|bas|dif|exp|cha)/.test(dat.Difficulty)
		if(asdf) { // song name missing (most common), find song using Steps and Freeze count
			for (const songName in list) { // strict Steps + Freeze search
				const chart = list[songName]
				if(chart.ChartStats.Steps !== dat.ChartStats.Steps) continue
				if(chart.ChartStats.Freeze !== dat.ChartStats.Freeze) continue
				return res(chart)
			}
		}
		// find with song name (not very reliable cause ocr dumb)
		for (const songName in list) { // strict Steps + Freeze search
			const chart = list[songName]
			if([dat.SongName,dat.SongName.replace(/ /g,'')].includes(chart.OriginalTitle)) return res(chart)
			if([dat.SongName.toLowerCase()].includes(songName.toLowerCase())) return res(chart)
		}
		if(list[dat.SongName]) return res(list[dat.SongName])
		if(asdf) {
			for (const songName in list) { // strict Steps, lenient Freeze search (OK + Misses <= Freezes?) 
				const chart = list[songName]
				if(chart.ChartStats.Steps !== dat.ChartStats.Steps) continue
				if(chart.ChartStats.Freeze !== dat.ChartStats.Freeze) {
					//if(!((dat.ChartStats.Freeze+dat.ChartStats.Judge.Miss) >= chart.ChartStats.Freeze)) continue
					if((chart.ChartStats.Freeze - dat.ChartStats.Freeze < dat.ChartStats.Judge.Miss) && (chart.ChartStats.Freeze.inRange(dat.ChartStats.Judge.OK,dat.ChartStats.Judge.Miss+dat.ChartStats.Judge.OK))) return res(chart)
				}
			}
		}
		console.log('Unrecognized song: ', dat)
		return err(dat)
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
Number.prototype.inRange = function(least, most) {
	return this >= least && this <= most
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
