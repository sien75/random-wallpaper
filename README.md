# Random-Wallpaper
[中文版](https://gitee.com/sien75/random-wallpaper)   
Random-Wallpaper can randomly get images from the given source, and set the image as your desktop wallpaper.
We will make a new folder called "random-wallpaper" in your picture folder to storage images.
You can also change the theme color, switch image source and browse images in the application.
## How to use
For windows users, download .exe setup file from the release part.   
For linux users, .deb or .rpm setup file from the release part.   
I don't have a Macbook or iMac, so no .pkg or .dmg files is built.
If you want to use this in MacOS, you should build by yourself.
## How to build
First get the repository:
```
git clone https://github.com/sien75/random-wallpaper.git
```
This application is written with JavaScript, nodejs and electron, built by electron-forge.
Refer to the [electron-forge's website](https://electronforge.io) to set a proper "makers" part in "package.json".
Then run the following command:
```
npm install
npm run make
```
## About client part
The web pages show by electron built-in chromium browser is built by Vue.
I put the build result in the "dist" folder.
This is what I call "client part".
If you are interested in "client part", go to my [rw-client repository](https://github.com/sien75/rw-client).
## Related
[wallpaper](https://github.com/sindresorhus/wallpaper) - a tool to manage the desktop wallpaper