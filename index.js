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
const filecodeblock = document.getElementById('fileScores')
const [cover,coverOld] = [new Image(),new Image()]
const letters = [...'abcdefghijklmnopqrstuvwxyz']
cover.src = './src/cover.png'; coverOld.src = './src/cover_old.png'
let fileUploadJS; fetch(`./fileUpload.js`).then(dat=>{dat.text().then(text=>{fileUploadJS = text})})
let running = 0
let commandIdx = 0
let [OCRqueue,OCRmax] = [0,((performance.memory.jsHeapSizeLimit.toString()[0]-0)*1.5) || 4]
let progressSum = []
let fileScores = {}
let charts = {}
const abrv = {'sbeg':'🔵 bSP • Single Beginner','sbas':'🟠 BSP • Single Basic','sdif':'🔴 DSP • Single Difficult','sexp':'🟢 ESP • Single Expert','scha':'🟣 CSP • Single Challenge','dbas':'🟠 BDP • Double Basic','ddif':'🔴 DDP • Double Difficult','dexp':'🟢 EDP • Double Expert','dcha':'🟣 CDP • Double Challenge'}
const diffHues = {
    beg: 194, // 192,196
    bas: 36.5, // 39,34
    dif: 349.5, // 351,348
    exp: 116, // 117,115
    cha: 292.5 // 291,294
}
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
	Object.keys(abrv).map(d => {
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
	codeblock.innerHTML = '<div id="fileScores"></div>'
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
	img.onload=async()=>{
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
			processOCR(inputElement,cvs.toDataURL(),imgURL)
		} else {  // screenshot is in DDR A format
			cvs.width = 930; cvs.height = 620;
			ctx.filter = 'invert(1) contrast(200%)'
			ctx.drawImage(img,0,0,cvs.width,cvs.height)
			const FAC = new FastAverageColor()

			let titleCvs = document.createElement('canvas')
			let titleCtx = titleCvs.getContext('2d')
			titleCvs.width = cvs.width; titleCvs.height = cvs.width/7 // Only need to get the song name
			titleCtx.drawImage(img,0,0,cvs.width,cvs.height)

			ctx.filter = 'invert(0) grayscale(100%) contrast(100%)'
			ctx.drawImage(titleCvs,0,0)
			ctx.filter = 'invert(0)'
			ctx.drawImage(cover,0,0,cvs.width,cvs.height)

			let grvRdrCvs = document.createElement('canvas')
			let grvRdrCtx = grvRdrCvs.getContext('2d')
			grvRdrCvs.width = img.width*(9/310); grvRdrCvs.height = img.height*(29/620)
			grvRdrCtx.drawImage(img,-(364/465)*img.width,-(269/620)*img.height)

			let diffCvs = document.createElement('canvas')
			let diffCtx = diffCvs.getContext('2d')
			diffCvs.width = img.width*(1/20); diffCvs.height = img.height*(1/40)
			diffCtx.drawImage(img,-(169/600)*img.width,-(117/400)*img.height)

			let grvRdrCol = await FAC.getColorAsync(grvRdrCvs)
			let diffCol = await FAC.getColorAsync(diffCvs)
			grvRdrCol = rgb2hsv(grvRdrCol.value).h || 185 // average groove radar hue: Single = 186, Doubles = 300. (243 is the mid range between the two)
			diffCol = rgb2hsv(diffCol.value).h || 116

			console.log(inputElement, diffCol)

			processOCR(
				inputElement,
				cvs.toDataURL(),
				imgURL,
				grvRdrCol>243,
				Object.keys(diffHues)[Object.values(diffHues).map((h,idx)=>[Math.abs(h-diffCol),idx]).sort((a,b)=>a[0]-b[0])[0][1]]
					// find difficulty by smallest hue difference from diffHues
			)
			FAC.destroy()
		}
	}
	img.onerror=()=>{
		running--
		if(!running) startBtn.textContent = 'Generate'
		codeblock.innerHTML += `<div class="command"><div class="NaN">// Could not fetch image!<br>// It's possible that the image URL doesn't return a usable <a class="viewUnrecognizedFile" target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS">CORS header</a>.<br>// <a class="viewUnrecognizedFile" target="_blank" href="${imgURL}">${escapeHtml(imgURL)}</a></a></div></div>`
	}
	img.src = imgURL
}

function processOCR(inputElement,imgURL,srcImg,isDouble,Difficulty) {
	// window.open().document.write(`<img src="${imgURL}"></img>`)
	const file = inputElement.FILE_ATTR
	let percent = inputElement.parentElement.getElementsByClassName('progress')[0]
	fileScores = {}
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
				Mode: (isDouble || /(?<=mode {0,})(D|d)/i.test(text))? 'd':'s', // if mode starts with D, it's doubles, else single/versus
				Difficulty,//: text.match(/(?<=difficulty) {0,}.{1,3}/i)[0].trim().toLowerCase(),
				URLEntered: inputElement.value,
				ImgSrc: srcImg,
				ChartStats: {
					Judge: {},
					Steps: 0,
					Freeze: 0
				}
			};
			if(!/(s|d)/.test(dat.Mode)) dat.Mode = 's' // default
			if(!/(beg|bas|dif|exp|cha)/.test(dat.Difficulty)) { // difficulty does not match strict search, use fuzzy search
				if (/(beg|.eg|b.g|be.|.e.|^be|g$|be|eg)/.test(dat.Difficulty)) dat.Difficulty = 'beg'
				else if(/(bas|.as|b.s|ba.|.a.|^ba|s$|ba|as)/.test(dat.Difficulty)) dat.Difficulty = 'bas'
				else if (/(dif|.if|d.f|di.|.i.|^d|f$|d|i|f)/.test(dat.Difficulty)) dat.Difficulty = 'dif'
				else if (/(exp|.xp|e.p|ex.|.x.|^e|p$|ex|xp)/.test(dat.Difficulty)) dat.Difficulty = 'exp'
				else if (/(cha|.ha|c.a|ch.|.h.|^c|a$|ch|ha)/.test(dat.Difficulty)) dat.Difficulty = 'cha'
				else dat.Difficulty = 'exp' // default
			}
			const j = dat.ChartStats.Judge;
			['Marvelous','Perfect','Great','Good','OK','Miss'].map(jd=>{j[jd] = parseInt(text.match(new RegExp(`(?<=${jd} {0,})\\d{1,}`,'i'))) })
			dat.ChartStats.Steps = ['Marvelous','Perfect','Great','Good','Miss'].map(jd=>{return j[jd]}).reduce((a,b)=>a+b,0)
			dat.ChartStats.Freeze = j.OK // doesn't count N.G. (missed freeze arrows)
			
			let localSongCode = commandIdx++
			searchChartID(dat).then(res => {
				console.log(res)
				let possibleCharts = Object.values(res[0])
				let chart = possibleCharts.length==1? possibleCharts[0] : possibleCharts.find(c=>c.NoteChartID==Object.keys(res[1]).reduce((a,b)=>res[1][a]>res[1][b]?a:b)) // default to chart that has most matches
				// const selectMenu = `<div class="command"><div class="${dat.Difficulty}">/* <select oninput="document.getElementById('NoteChartID-${localSongCode}').innerText = this.value"><option disabled>─── Approximate Guesses (found by using Note+Freeze count) ───</option>${possibleCharts.map(c=>{return `<option ${c.NoteChartID==chart.NoteChartID?'selected':''} value="${c.NoteChartID}">${c.OriginalTitle}</option>`})}<option disabled>─── All Other Songs ───</option>${Object.values(charts[gameID.value][`${dat.Mode}${dat.Difficulty}`]).map(c => {return res[0][c.NoteChartID]? '' : `<option value="${c.NoteChartID}">${c.OriginalTitle}</option>`})}</select>`
				const selectMenu = `<div class="command"><div class="${dat.Difficulty}">/* <select oninput="document.getElementById('NoteChartID-${localSongCode}').innerText = this.value"><option disabled>─── Approximate Guesses (found by using Note+Freeze count) ───</option>${possibleCharts.map(c=>{return `<option ${c.NoteChartID==chart.NoteChartID?'selected':''} value="${c.NoteChartID}">${c.OriginalTitle}</option>`})}<option disabled>─── All Other Songs ───</option>${getSongOptionList(dat.Mode+dat.Difficulty, Object.keys(res[1]))}</select>`

				inputElement.parentElement.parentElement.appendChild(inputElement.parentElement)
				percent.textContent = '✅ 100%'
				if(dat.URLEntered) { // Image/Tweet URL
					codeblock.innerHTML += [
					selectMenu,
					`// ${dat.Difficulty=='beg'?'b':(dat.Difficulty[0].toUpperCase())}${dat.Mode.toUpperCase()}P, Notes: ${chart.ChartStats.Steps}+${chart.ChartStats.Freeze} */`,
					`</div>fetch("https://zenius-i-vanisher.com/v5.2/ddrscoretracker_scoreentry.php",{"headers":{"content-type":"application/x-www-form-urlencoded"},"body":"submit=1&notechartid=<span id="NoteChartID-${localSongCode}">${chart.NoteChartID}</span>&difficulty=${dat.Mode}${dat.Difficulty}&gameid=${gameID.value}&<span class="marvelous">marvelous</span>=<span class="marvelous">${j.Marvelous}</span>&<span class="perfect">perfect</span>=<span class="perfect">${j.Perfect}</span>&<span class="great">great</span>=<span class="great">${j.Great}</span>&<span class="good">good</span>=<span class="good">${j.Good}</span>&<span class="almost">almost</span>=<span class="almost">0</span>&<span class="miss">boo</span>=<span class="miss">${j.Miss}</span>&<span class="ok">ok</span>=<span class="ok">${j.OK}</span>&speed=1.5x&boost=Off&appearance=Normal&turn=Normal&dark=Off&scroll=Normal&arrow=Note&other=&pictureid=&comment=${'Semi-automatically+uploaded+with+EATZ+(https%3A%2F%2Fgithub.com%2Faznguymp4%2Featz)'}&videolink=${encodeURIComponent(dat.URLEntered)}&pass=on&fullcombo=${j.Miss?'off':'on'}","method":"POST"});<br><br></div>`]
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
					fileScores[`${encodeURIComponent(file.name)}/${file.size}`] = {
						cont: {'headers':{'content-type':'application/x-www-form-urlencoded'},'body':`submit=1&localsongcode=${localSongCode}&notechartid=${chart.NoteChartID}&difficulty=${dat.Mode}${dat.Difficulty}&gameid=${gameID.value}&marvelous=${j.Marvelous}&perfect=${j.Perfect}&great=${j.Great}&good=${j.Good}&almost=0&boo=${j.Miss}&ok=${j.OK}&speed=1.5x&boost=Off&appearance=Normal&turn=Normal&dark=Off&scroll=Normal&arrow=Note&other=&pictureid=12345&comment=Semi-automatically+uploaded+with+EATZ+(https%3A%2F%2Fgithub.com%2Faznguymp4%2Featz)&videolink=&pass=on&fullcombo=${j.Miss?'off':'on'}`,'method':'POST'},
						song: {
							diff: dat.Difficulty,
							mode: dat.Mode
						}
					}
					codeblock.innerHTML += [
					// `<div class="command"><span class="${dat.Difficulty}">// ${chart.OriginalTitle}`,
					selectMenu,
					`// ${dat.Difficulty=='beg'?'b':(dat.Difficulty[0].toUpperCase())}${dat.Mode.toUpperCase()}P, Notes: ${chart.ChartStats.Steps}+${chart.ChartStats.Freeze}</span>`,
					`// ${`<button class="viewUnrecognizedFile" onclick=\"window.open().document.write('<title>EATZ - Image File</title><img src=\\'${dat.ImgSrc}\\'></img>')\">Image</button>`} is an uploaded file, paste the command in Zenius to proceed to the next step.*/</div>`]
					.join('<br>').replace(/&/g,'&amp;')
				}
			}).catch(e => {
				inputElement.parentElement.parentElement.prepend(inputElement.parentElement)
				percent.textContent = '❌ Unrecognized!'
				//codeblock.innerHTML = `<div class="command"><div class="NaN">// Song unrecognized!<br>// You may have to submit the score manually. 😞<br>// ${dat.ImgSrc.toString().startsWith('data:image')? `<button class="viewUnrecognizedFile" onclick=\"window.open().document.write('<title>EATZ - Unrecognized Song</title><img src=\\'${dat.ImgSrc}\\'></img>')\">View Image</button>` : `<a class="viewUnrecognizedFile" target="_blank" href="${dat.ImgSrc}">${escapeHtml(dat.ImgSrc)}</a>`}</div></div>` + codeblock.innerHTML
				if(file) dat.file={name:file.name,size:file.size}
				dat.localSongCode=localSongCode
				
				codeblock.innerHTML = [
				`<div class="command" id="command-${localSongCode}">/* <select disabled id="unrecognizedSong-${localSongCode}"><option disabled selected>─── Select Mode First ⤵️ ───</option></select>`,
				`// <select oninput='loadSongList(${localSongCode},this.value,${JSON.stringify(dat)}); document.getElementById("command-${localSongCode}").classList="command "+this.value.substr(1,3)'><option disabled selected>─── Select Mode ───</option><optgroup label="Single">${Object.keys(abrv).map((mode,idx) => {return `<option value="${mode}">${abrv[mode]}</option>${idx==4?`</optgroup><optgroup label="Double">`:''}`})}</optgroup></select>`,
				`// ${`<button class="viewUnrecognizedFile" onclick=\"window.open().document.write('<title>EATZ - Unrecognized Song</title><img src=\\'${dat.ImgSrc}\\'></img>')\">Image</button>`} is an uploaded file, paste the command in Zenius to proceed to the next step.*/</div>`]
				.join('<br>').replace(/&/g,'&amp;') + codeblock.innerHTML
				delete dat.ImgSrc
			}).finally(()=>{
				running--;
				if(running) return; // done scanning all imgs
				setTimeout(() => { alert('Finished scanning each image.\n\nPlease look through each song on the right side and make any corrections if needed.') },300)
				startBtn.textContent = 'Generate'
				if(!Object.keys(fileScores).length) return
				processFileScores()
			})
		})
	}
}

function loadSongList(id, diff, dat) {
	const sel = document.getElementById(`unrecognizedSong-${id}`)
	const j = dat.ChartStats.Judge

	sel.oninput=()=>{
		fileScores[`${dat.file.name}/${dat.file.size}`] = {
			cont: {'headers':{'content-type':'application/x-www-form-urlencoded'},'body':`submit=1&localsongcode=${dat.localSongCode}&notechartid=${sel.value}&difficulty=${dat.Mode}${dat.Difficulty}&gameid=${gameID.value}&marvelous=${j.Marvelous}&perfect=${j.Perfect}&great=${j.Great}&good=${j.Good}&almost=0&boo=${j.Miss}&ok=${j.OK}&speed=1.5x&boost=Off&appearance=Normal&turn=Normal&dark=Off&scroll=Normal&arrow=Note&other=&pictureid=12345&comment=Semi-automatically+uploaded+with+EATZ+(https%3A%2F%2Fgithub.com%2Faznguymp4%2Featz)&videolink=&pass=on&fullcombo=${j.Miss?'off':'on'}`,'method':'POST'},
			song: {
				diff: dat.Difficulty,
				mode: dat.Mode
			}
		}
		processFileScores()
	}

	sel.innerHTML = [
		`<option disabled selected>─── Select Song ───</option>`,
		getSongOptionList(diff),
	].join('')
	sel.disabled = false
}

function getSongOptionList(diff, filter) {
	const list = charts[gameID.value][diff]
	let lastLetter

	return Object.keys(list).map(key => {
		const c = list[key]
		if(filter && filter.includes(c.NoteChartID+'')) return '';
		let curLetter = /^[a-zA-Z]/.test(key[0])? key[0].toUpperCase() : 'NUM / SYMBOL'
		const idk = lastLetter==curLetter
		lastLetter = curLetter
		return `${idk?'':`</optgroup><optgroup label="🔹MUSIC SORT ${curLetter.toUpperCase()}">`}<option value="${c.NoteChartID}">${c.OriginalTitle}</option>`
	}).join('')
}

function processFileScores() {
	codeblock.appendChild(filecodeblock)
	filecodeblock.innerHTML = escapeHtml(fileUploadJS).replace('SCOREPLACEHOLDER',escapeHtml(JSON.stringify(fileScores)).replace(/localsongcode=/g, 'notechartid=<span id="NoteChartID-').replace(/(?<=NoteChartID-\d{1,})&amp;notechartid=/g,'">').replace(/(?<=NoteChartID-\d{1,}">\d{1,})&amp;/g,'</span>&amp;'))
}

function searchChartID(dat) { // tries its best to find the chart ID with the info provided by the OCR
	return new Promise((res,err)=>{
		console.log(dat)
		const valid = /(s|d)/.test(dat.Mode) && /(beg|bas|dif|exp|cha)/.test(dat.Difficulty)
		if(!valid) return err(dat)
		const list = charts[gameID.value][`${dat.Mode}${dat.Difficulty}`]
		let matchesForChart = {} // to see which chart matches the most criterias
		let possible = {}
		function markChartPossible(chart,pts = 1){
			if(!chart) return;
			if(!matchesForChart[chart.NoteChartID]) matchesForChart[chart.NoteChartID] = 0
			matchesForChart[chart.NoteChartID] += pts * ((stringSimilar(chart.OriginalTitle,dat.SongName)*1.8) + (stringSimilar(chart.RomanizedTitle,dat.SongName)*.6))
			possible[chart.NoteChartID] = chart
		}
		
		// exact name match; gets 3 priority points
		if(list[dat.SongName]) markChartPossible(list[dat.songName],3)

		for (const songName in list) {
			const chart = list[songName]
			const J = dat.ChartStats.Judge

			// strict search through OriginalTitles
			const similarity = stringSimilar(chart.OriginalTitle, dat.SongName)
			if(similarity > .5) markChartPossible(chart,2.1*similarity)
			if(chart.OriginalTitle == dat.songName) markChartPossible(chart,3) // strict OriginalTitle search

			// find with song name (not very reliable cause ocr dumb)
			if([dat.SongName,dat.SongName.replace(/ /g,'')].includes(chart.OriginalTitle)) markChartPossible(chart)
			if([dat.SongName.toLowerCase()].includes(songName.toLowerCase())) markChartPossible(chart)

			// song name missing (most common), find song using Steps and Freeze count
			// strict Steps + Freeze search
			if((chart.ChartStats.Steps == dat.ChartStats.Steps)
			&& (chart.ChartStats.Freeze == dat.ChartStats.Freeze))
			markChartPossible(chart)

			// lenient Steps + Freeze search
			// lenient Steps (if Steps is higher than it's supposed to be, such as missing a Freeze/Shock which adds Miss instead of N.G., take the excess and add that to Freeze and see if Data matches the Chart)
			if((dat.ChartStats.Steps > chart.ChartStats.Steps)
			&& ((dat.ChartStats.Steps-chart.ChartStats.Steps)+J.OK == chart.ChartStats.Freeze)
			&& ((dat.ChartStats.Steps-(chart.ChartStats.Freeze-J.OK)) == chart.ChartStats.Steps))
			markChartPossible(chart)
			
			// strict Steps, lenient Freeze search (OK + Misses <= Freezes?)
			if((chart.ChartStats.Steps == dat.ChartStats.Steps
			&& chart.ChartStats.Freeze !== dat.ChartStats.Freeze)
			&& (chart.ChartStats.Freeze - dat.ChartStats.Freeze < J.Miss)
			&& (chart.ChartStats.Freeze.inRange(J.OK,J.Miss+J.OK)))
			markChartPossible(chart)
		}

		if(Object.keys(possible).length) return res([possible, matchesForChart])
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

function stringSimilar(s1, s2) { // float from 0 to 1 indicating how similar two strings are
	let [longer,shorter] = [s1.toLowerCase(),s2.toLowerCase()]
	if (s1.length < s2.length) {
		longer = s2
		shorter = s1
	}
	let longerLength = longer.length;
	if (longerLength == 0) return 1

	let costs = new Array()
	for (let i=0;i<=s1.length;i++) {
		let lastVal = i
		for (let j=0;j<=s2.length;j++) {
			if(!i) costs[j] = j
			else {
				if(j) {
					let newVal = costs[j - 1]
					if(s1.charAt(i-1)!=s2.charAt(j-1)) newVal = Math.min(Math.min(newVal, lastVal), costs[j])+1
					costs[j - 1] = lastVal
					lastVal = newVal
				}
			}
		}
		if (i) costs[s2.length] = lastVal
	}
	return (longerLength - costs[s2.length]) / parseFloat(longerLength)
}

function rgb2hsv(rgb) { // https://stackoverflow.com/a/8023734
    let rabs, gabs, babs, rr, gg, bb, h, s, v, diff, diffc, percentRoundFn;
	let [r,g,b] = rgb
    rabs = r / 255;
    gabs = g / 255;
    babs = b / 255;
    v = Math.max(rabs, gabs, babs),
    diff = v - Math.min(rabs, gabs, babs);
    diffc = c => (v - c) / 6 / diff + 1 / 2;
    percentRoundFn = num => Math.round(num * 100) / 100;
    if (diff == 0) {
        h = s = 0;
    } else {
        s = diff / v;
        rr = diffc(rabs);
        gg = diffc(gabs);
        bb = diffc(babs);

        if (rabs === v) {
            h = bb - gg;
        } else if (gabs === v) {
            h = (1 / 3) + rr - bb;
        } else if (babs === v) {
            h = (2 / 3) + gg - rr;
        }
        if (h < 0) {
            h += 1;
        }else if (h > 1) {
            h -= 1;
        }
    }
    return {
        h: Math.round(h * 360),
        s: percentRoundFn(s * 100),
        v: percentRoundFn(v * 100)
    };
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
 * Run this code on the ZiV score tracker page to open each tracker page
 * 

const gameIDs = {
	'5518': 'A3',
	'5156': 'A20PLUS',
	'3802': 'A20',
	'2979': 'A',
	'1129': '2013_2014'
}
const modes = ['sbeg','sbas','sdif','sexp','scha','dbas','ddif','dexp','dcha']

Object.keys(gameIDs).map(gID => {
    modes.map(mode => {
        let newDoc = window.open(`https://zenius-i-vanisher.com/v5.2/ddrscoretracker_game.php?gameid=${gID}&difficulty=${mode}&sort=default&action=printGameView&list_view=1`).document
    })
})

 *
 * Run this code on each tab after running the code above to download a .json for each mode
 *


function download(filename, text) {
	let element = document.createElement('a')
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
	element.setAttribute('download', filename)
	element.style.display = 'none'
	document.body.appendChild(element)
	element.click();
	document.body.removeChild(element)
}
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
		RomanizedTitle: row.getAttribute('title'),
        ChartStats: {
            Steps: parseInt(stats[0]),
            Freeze: parseInt(stats[1])
        }
    }
}
download(`${new URLSearchParams(window.location.search).get('difficulty')}.json`,JSON.stringify(json))

*/
