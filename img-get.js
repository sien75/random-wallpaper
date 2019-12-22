const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')

module.exports = function () {
    let app;
    let imgPath, cfgPath;

    this.set = _app => {
        app = _app;
        imgPath = path.join(app.getPath('pictures'), 'random-wallpaper');
        cfgPath = app.getPath('userData');
    }

    this.getOne = source => {
        return new Promise((resolve, reject) => {
            this[source]().then(({httpOrHttps, hostname, path: _path, imgName}) => {
                let request = httpOrHttps.request({hostname, path: _path}, response => {
                    if(response.statusCode != 200) {
                        reject('http get image error, not a 200 status code');
                        return;
                    }
                    response.pipe(fs.createWriteStream(path.join(imgPath, imgName)));
                    response.on('end', () => {
                        resolve(imgName);
                    }).on('error', reject)
                })
                request.on('error', reject)
                request.end();
            }).catch(reject)
        })
    }

    this['wallhaven.cc'] = () => {
        function readCfg () {
            return new Promise((resolve, reject) => {
                fs.readFile(path.join(cfgPath, 'wallhaven.cc.json'), 'utf-8', (err, data) => {
                    if(data == undefined) {
                        resolve([]);
                        return;
                    }
                    if(err) {
                        reject(err);
                        return;
                    }
                    data = JSON.parse(data);
                    resolve(data);
                })
            })
        }

        function getNewInfo () {
            return new Promise((resolve, reject) => {
                let d = '';
                let request = https.request({
                    hostname: 'wallhaven.cc',
                    path:'/api/v1/search?sorting=random'
                }, response => {console.log('aaaaa')
                    if(response.statusCode != 200) {
                        reject('http get image error');
                        return;
                    }
                    response.on('data', chunk => {
                        d += chunk;
                    }).on('end', () => {
                        resolve(JSON.parse(d).data);
                    }).on('error', reject)
                })
                request.on('error', reject);
                request.end();
            })
        }

        function setCfg (infos) {
            return new Promise((resolve, reject) => {
                fs.writeFile(path.join(cfgPath, 'wallhaven.cc.json'), JSON.stringify(infos, null, '\t'), err => {
                    if(err) reject(err);
                    else resolve();
                })
            })
        }

        return new Promise((resolve, reject) => {
            let info;
            readCfg().then(infos => {
                if(infos.length == 0) {
                    return getNewInfo();
                }
                return nullPromise(infos);
            }).then(infos => {
                info = infos.shift();
                console.log('[info]: wallhaven.cc.json length = ', infos.length);
                return setCfg(infos);
            }).then(() => {
                let url = info.path, hostname, path, imgName;
                let i = url.indexOf('//');
                url = url.slice(i + 2);
                i = url.indexOf('/');
                hostname = url.slice(0, i);
                path = url.slice(i);
                i = 0;
                while(url.indexOf('/', i + 1) != -1) {
                    i = url.indexOf('/', i + 1);
                }
                imgName = url.slice(i + 1);
                resolve({httpOrHttps: https, hostname, path, imgName});
            }).catch(reject)
        })
    }

    let nullPromise = a => {
        return new Promise((resolve, reject) => {
            if(a != undefined) resolve(a)
            else resolve()
        })
    }
}