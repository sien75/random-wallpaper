const fs = require('fs')
const path = require('path')
const imgGet = new (require('./img-get'))()
const wallpaper = require('wallpaper')

module.exports = function (app, ipcMain) {
    let mainWindow, state = false, fileState = false;
    let imgPath = path.join(app.getPath('pictures'), 'random-wallpaper');
    let cfgPath = path.join(app.getPath('userData'), 'rwconfig.json');
    imgGet.set(app);
    initRwConfig();

    this.set = _mainWindow => {
        mainWindow = _mainWindow;
    }

    this.getFrame = () => {
        return new Promise((resolve, reject) => {
            readCfg().then(cfg => {
                resolve(cfg.settings.ifFrame);
            }).catch(reject)
        })
    }

    ipcMain.on('info-request', (event, arg) => {
        console.log('[ipc-info-request] ', arg);
        let {request, params} = arg;
        if(request == 'minimize') {
            mainWindow.minimize();
            return;
        }
        if(request == 'close') {
            mainWindow.close();
            return;
        }
        if(state) return;
        state = true;

        switch(request) {
            case 'init': {
                let cfg, files, curAllImgs = [], toBedeletedFiles = [];
                readCfg().then(_cfg => {
                    cfg = _cfg;
                    return readImgs();
                }).then(_files => {
                    files = _files;
                    let hasDeleted = false, hasAdded = false;
                    for(let img of cfg.allImgs) {
                        if(files.includes(img)) {
                            curAllImgs.push(files.splice(files.indexOf(img), 1)[0]);
                        }
                        else hasDeleted = true;
                    }
                    if(files.length > 0) {
                        hasAdded = true;
                        curAllImgs = files.concat(curAllImgs);
                        if(cfg.settings.max != 'infinite' && curAllImgs.length > cfg.settings.max) {
                            toBedeletedFiles = curAllImgs.splice(0, curAllImgs.length - cfg.settings.max);
                        }
                    }
                    if(hasDeleted || hasAdded) {
                        cfg.allImgs = curAllImgs;
                        return setCfg(cfg);
                    }
                    return nullPromise();
                }).then(() => {
                    if(toBedeletedFiles.length > 0) {
                        return deleteImgs(toBedeletedFiles);
                    }
                    return nullPromise();
                }).then(() => {
                    event.reply('info-reply', cfg);
                    state = false;
                    return nullPromise();
                }).catch(err => {
                    event.reply('info-reply', cfg);
                    state = false;
                    console.log('[ipc error] ', err);
                });
                break;
            }

            case 'random': {
                let imgName, cfg = null;
                imgGet.getOne(params.source).then(_imgName => {
                    imgName = _imgName;
                    return readCfg();
                }).then(_cfg => {
                    cfg = _cfg;
                    cfg.allImgs.push(imgName);
                    cfg.currentBg = imgName;
                    if(cfg.allImgs.length > cfg.settings.max) {
                        return deleteImgs([cfg.allImgs.shift()]);
                    }
                    return nullPromise();
                }).then(() => {
                    return setCfg(cfg);
                }).then(() => {
                    event.reply('info-reply', cfg);
                    wallpaper.set(path.join(imgPath, cfg.currentBg));
                    state = false;
                }).catch(err => {
                    event.reply('info-reply', cfg);
                    state = false;
                    console.log('[ipc error] ', err);
                });
                break;
            }

            case 'set-bg': {
                let cfg;
                readCfg().then(_cfg => {
                    cfg = _cfg;
                    cfg.currentBg = params.currentBg;
                    return setCfg(cfg);
                }).then(() => {
                    event.reply('info-reply', cfg);
                    wallpaper.set(path.join(imgPath, cfg.currentBg));
                    state = false;
                }).catch(err => {
                    event.reply('info-reply', cfg);
                    state = false;
                    console.log('[ipc error] ', err);
                });
                break;
            }

            case 'settings': {
                let cfg;
                readCfg().then(_cfg => {
                    cfg = _cfg;
                    cfg.settings[params.part] = params.value;
                    return setCfg(cfg);
                }).then(() => {
                    event.reply('info-reply', cfg);
                    state = false;
                }).catch(err => {
                    event.reply('info-reply', cfg);
                    state = false;
                    console.log('[ipc error] ', err);
                });
                break;
            }
        }
    })

    ipcMain.on('file-request', (event, arg) => {
        console.log('[ipc-file-request] ', arg);
        if(fileState) return;
        fileState = true;
        let num = 0;
        arg.forEach(a => {
            fs.readFile(path.join(imgPath, a), (err, data) => {
                let arr = a.split('.');
                let mimeType = arr[arr.length - 1] == 'png' ? {type: 'image/png'} : {type: 'image/jpeg'};
                event.reply('file-reply', {state: 'handling', name: a, data: data, mimeType});
                if(++num == arg.length) {
                    event.reply('file-reply', {state: 'finished'});
                    fileState = false;
                }
            })
        })
    })

    function initRwConfig () {
        try {
            fs.statSync(app.getPath('userData'));
        } catch(err) {
            if(err) fs.mkdirSync(app.getPath('userData'));
        }
        try {
            fs.statSync(cfgPath)
        } catch (err) {
            if(err) {
                let cfg = {
                    currentBg: null,
                    allImgs: [
                    ],
                    settings: {
                        max: 20,
                        maxes: [20, 100, 200, 'infinite'],
                        source: 'wallhaven.cc',
                        sources: ['wallhaven.cc'],
                        ifFrame: false,
                    }
                }
                fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, '\t'));
            }
        }
        try {
            fs.statSync(imgPath)
        } catch (err) {
            if(err) fs.mkdirSync(imgPath)
        }
    }

    function readCfg () {
        return new Promise((resolve, reject) => {
            fs.readFile(cfgPath, 'utf-8', (err, data) => {
                if(err) reject(err);
                else resolve(JSON.parse(data));
            })
        })
    }

    function readImgs () {
        return new Promise((resolve, reject) => {
            fs.readdir(imgPath, (err, files) => {
                if(err) reject(err);
                else resolve(files);
            })
        })
    }

    function setCfg (cfg) {
        return new Promise((resolve, reject) => {
            fs.writeFile(cfgPath, JSON.stringify(cfg, null, '\t'), err => {
                if(err) reject(err);
                else resolve();
            })
        })
    }

    function deleteImgs (imgs) {
        return new Promise((resolve, reject) => {
            if(imgs.length == 0) {
                resolve();
                return;
            }
            let num = 0;
            let errors = [];
            imgs.forEach(v => {
                fs.unlink(path.join(imgPath, v), err => {
                    num++;
                    if(err) errors.push(err);
                    if(num == imgs.length) {
                        if(errors.length > 0) reject(errors);
                        else resolve();
                    }
                })
            })
        })
    }

    function nullPromise () {
        return new Promise((resolve) => {
            resolve()
        })
    }
}
