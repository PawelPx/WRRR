const {ipcMain, ipcRenderer}  = require('electron-better-ipc')
const fs = require('fs');


ipcMain.on('test', (event, img) => {
    // console.log("works on main", img)

    var data = img.replace(/^data:image\/\w+;base64,/, "");
    var buf = Buffer.from(data, 'base64');

    fs.writeFile('img.png', buf, (err) => {
        // throws an error, you could also catch it here
        if (err) throw err;

        // success case, the file was saved
        console.log('Lyric saved!');
    });

})

ipcMain.on('media', (event, media) => {

    console.log(media)


})