const body   = document.getElementsByTagName('body')[0];
const input  = document.createElement('input');
const label  = document.createElement('label');
const submit = document.createElement('button');
let uploading = false;
input.type = 'file';
input.id = 'fileInput';
input.multiple = true;
input.accept = '.jpg,.jpeg,.png';
submit.style.display='none';
label.innerHTML = '<h1>Upload the same file(s) here that you uploaded in EATZ.</h1><h3>This will <u>BULK UPLOAD</u> your images to the <a target="_blank" href="https://zenius-i-vanisher.com/v5.2/picturegallery.php?categoryid=39">score tracker picture gallery</a> so that you can attach it to your tracked scores.</h3><h1> </h1><br>';
label.for = input.id;
body.prepend(label, input, submit);
document.body.scrollTop = document.documentElement.scrollTop = 0;
input.addEventListener('change',()=>{
	if(input.files.length) {
		submit.style.display = 'inline-block';
		submit.textContent = `CLICK HERE to ${input.files.length==1?'':'bulk '}upload your ${input.files.length} image${input.files.length==1?'':'s'} and automatically submit EATZ scores.`;
	} else submit.style.display = 'none';
});
const abrv = {'beg':'Beginner','bas':'Basic','dif':'Difficult','exp':'Expert','cha':'Challenge','s':'Single','d':'Doubles'};
const scores={'place':'holder'};
submit.addEventListener('click',()=>{
	Array.from(input.files).map(file => {
		let score = scores[`${file.name}/${file.size}`];
		if(score) {
			function wait() {
				if(uploading) setTimeout(wait,500); /* ZiV doesn't like it when you start multiple image uploads at once... */
				else {uploading=true; start()};
			} wait();
			function start() {
				console.log(`Starting: ${file.name}`);
				fetch('https://zenius-i-vanisher.com/v5.2/uploadpicture.php', {
					headers: {
						'Content-Type': file.type,
						'x-category-id': '39',
						'x-description': `${abrv[score.song.diff]} - ${abrv[score.song.mode]} Play - Semi-automatically uploaded with EATZ (https://github.com/aznguymp4/eatz)`,
						'x-file-size': file.size,
						'x-name': file.name
					},
					body: file,
					method: 'POST'
				}).then(res => {
					res.text().then(txt=>{
						let json = JSON.parse(txt);
						if(json.success) {
							score.cont.body = score.cont.body.replace('pictureid=12345',`pictureid=${json.pictureid}`);
							if(score.imgURL) score.cont.body = score.cont.body.replace('videolink=',`videolink=${encodeURIComponent(imgURL)}`);
							fetch('https://zenius-i-vanisher.com/v5.2/ddrscoretracker_scoreentry.php', score)
							.then(res=>{
								console.log(res);
								body.prepend(`✅ Success: ${file.name}`);
							}).catch(err=>{
								console.error(err);
								body.prepend(`❌ Error submitting score!: ${file.name}`);
							});
						} else console.log('❌ Error uploading photo!: ', txt);
					});
				}).catch(error => {
					console.error(error);
				}).finally(()=>{
					setTimeout(() => { uploading = false; }, 1400); /* Upload cooldown is MANDATORY, or else ZiV will glitch out */
				});
			}
		} else body.prepend(`🟡 Skipped...: ${file.name}`);
	});
});