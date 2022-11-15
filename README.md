# EATZ (e-amusement to zenius)
Efficiently upload **DDR e-amusement PlayShare** (プレーシェア) screenshots to [ZiV DDR Score Tracker](https://zenius-i-vanisher.com/v5.2/ddrscoretracker.php?function=enterscore).

### Latest Version Supported: DDR A20 PLUS
##### DDR A3 is supported, but no DDR A3 songs have been added to the database just yet.

## Notes
- ❗️❗️❗️ Uploading scores to ZiV with EATZ does involve pasting console commands, but it is 100% safe! If you're still unsure, this project is open-source so you can look at the code.
- EATZ uses [tesseract.js](https://github.com/naptha/tesseract.js) (compiled with [browserify](https://github.com/browserify/browserify)) to scan your screenshots for data, such as song names, judgement counts, etc.
- EATZ currently doesn't scan for chart modifiers (speed mod, boost, turn, etc.), so x1.5 <img src="https://raw.githubusercontent.com/Curilang/DDR-A3-THEME/main/Themes/DDR%20A3/Graphics/OptionIcon/P1/daopic0000_1p_speed_x150.png" height="22px"> and Note <img src="https://media.discordapp.net/emojis/939036886901616690.gif" height="22px"> will be set by default.
- There may be some songs that EATZ can't recognize when scanning screenshots. It doesn't happen very often but unfortunately, you'll have to enter those outliers manually.

## Usage
1. [Setting up PlayShare](#setting-up-playshare)
2. [Accessing the Screenshots](#accessing-the-screenshots)
3. [Using EATZ and Uploading to ZiV](#using-eatz-and-uploading-to-ziv)


## Setting up PlayShare
1. Download **[e-amusementアプリ](https://eam.573.jp/app/web/howto/?page=playshare.html)** on your [iOS](https://apps.apple.com/jp/app/id680436505) or [Android](https://play.google.com/store/apps/details?id=jp.konami.eam.link) device.
2. Log into your KONAMI ID Account that is linked to your e-amusement card you use when playing DDR at the arcade.
3. After logging in, you will unlock the feature to save in-game screenshots when playing DDR by pressing 1️⃣ on the numpad at the results screen.

## Accessing the Screenshots
When playing DDR, pressing 1️⃣ at the results screen will send the image to your account. To access the image(s), do the following:

![PlayShare guide](https://media.discordapp.net/attachments/860985407452479508/1041973885450584064/guide.png)

## Using EATZ and Uploading to ZiV
1. Paste in image URLs or tweet URLs that contain PlayShare screenshots.
2. Click **Generate** to scan the screenshots and generate the console command(s).
3. Once generated, click the code block on the right to select the entire command and **copy it**.
4. Head over to the [ZiV DDR Score Tracker](https://zenius-i-vanisher.com/v5.2/ddrscoretracker.php?function=enterscore) website
5. Open DevTools; There are many methods to do so:
	1. Use `F12`.
	2. Right click anywhere and click `Inspect Element`.
	3. Use `Ctrl+Shift+I` if on Windows.
	4. Use `Command+Option+I` if on macOS.
	- If you can't open DevTools on Safari, enable Developer mode: `Command+,`>`Advanced`>`Show Develop menu`
6. Open the `Console` tab in DevTools
7. Paste the command, and you're done. [!!!](#stuff)

![thumbnail](https://media.discordapp.net/attachments/860985407452479508/1041986453506375680/thumb.png)