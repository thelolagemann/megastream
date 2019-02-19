/**
 * npm module deps
 */
const express = require('express');
const { File } = require('megajs');
const { log } = require('./helpers');

/**
 * bootstrap express app
 */
const app = new express();

/**
 * various things 
 */
const baseMega = 'https://mega.nz/#';

/**
 * helpers
 */
const genFolderJSON = (req, folder, child) => {
  return folder.map((file, i) => {
    if (file.directory) {
      return {
        name: file.attributes.n,
        children: genFolderJSON(req, file.children, i)
      }
    } else {
      return {
        name: file.attributes.n,
        streamableLink: `${genFullURL(req)}/${child ? child + '/' : ''}${i}`
      }
    }
  })
}

const genHeaders = (start, end, fileSize, chunkSize) => {
  return {
    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
    'Accept-Range': 'bytes',
    'Content-Length': chunkSize,
    'Content-Type': 'video/x-matroska'
  }
}

const genFullURL = (req) => { return req.protocol + '://' + req.get('host') + req.originalUrl }

/**
 * init some vars
 */
let currentStream;
let currentReq = 0;
let lastReq = 0;
let isStreaming = false;

/**
 * handle streaming individual files from mega
 * TODO: Handle multiple streams possibly
 */
app.get('/stream/:link/:file?', (req, res) => {
  
  // if directory
  if (Object.keys(req.query)[0]) {
    
  }

  // init requests interval var
  let streamTimer;
  
  // increment current requests
  currentReq++;
  
  // close event handler
  req.on('close', () => {
    if (lastReq == currentReq) {
      log(`Stopping playback of ${currentStream}`);
      currentStream = '';
      isStreaming = false;
      currentReq = 0;
      lastReq = 0;
    }
    
    lastReq = currentReq;
  })

  req.on("aborted", () => {
    if (lastReq == currentReq) {
      log(`Playback of ${currentStream} aborted`);
      currentStream = "";
      isStreaming = false;
      currentReq = 0;
      lastReq = 0;
    }
    lastReq = currentReq;
  })
  
  
  var file = File.fromURL(baseMega + req.params.link);
  var fileSize = null;
  file.loadAttributes((err, data) => {
    if (err) res.writeHead(500).send(err);

    // Check if folder
    if (data.directory) {
      if (Object.keys(req.query)[0]) {
        // Get file id?
        let fileId = Object.keys(req.query)[0]
        file = data.children.find(child => child.downloadId[1] == fileId)
        // console.log(file)
        fileSize = file.size
        if (currentStream !== file.name) {
          log(`Streaming ${file.name} from ${data.name}`)
          currentStream = file.name
        }
      } else {
        log(`${req.headers['user-agent']} tried to stream ${data.name} but failed to provide a file id`)
      }
    } else {
      fileSize = data.size
      // Handle current stream
      if (currentStream !== data.name) {
        log(`Streaming ${data.name} to ${req.headers['user-agent']} via ${req.protocol}`);
        currentStream = data.name;
      }
    }
    
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;

      res.writeHead(206, genHeaders(start, end, fileSize, chunkSize));
      const dlPipe = file
        .download({start, end, maxConnections: 1})
        .on("error", err => {
          if (err.hasOwnProperty("timeLimit")) {
            log (err)
          } else {
            log(err)
          }
        });
        
    
      // create 5 second interval to watch for stream end
      streamTimer = setInterval(() => {
        if (!isStreaming) {
          dlPipe.emit('close')
          dlPipe.destroy();
          clearInterval(streamTimer);
        }
      }, 5000);
      dlPipe
        .pipe(res)
        .on("error", err => log(err));
      
    } else {
      const head = {
        'Content-Length': fileSize,
        'type': 'video/mp4'
      };
      res.writeHead(206, head);
      file
        .download({start: 0, end: 1024 * 1024, maxConnections: 1})
        .pipe(res)
        .on("error", err => log(err));
  
    }

    isStreaming = true;
  })
})

/**
 * barebones api for folders
 * TODO: make this actually work
 */
app.get('/folder/:link/:child?', function (req, res) {
  const folder = File.fromURL(baseMega + req.params.link)
  
  if (req.params.child === undefined) {

    folder.loadAttributes((err, data) => {
      res.json(genFolderJSON(req, data.children))
      /*res.json(data.children.map((f, i) => {
        console.log(f.children)
        if (f.directory) {
          return {
            name: f.attributes.n,
            children: f.children.map()
          }
        } else {
          return {
            name: f.attributes.n,
            streamableLink: `${genFullURL(req)}/${i}`
          }
        }
      }))*/
    })
  } 
})

// TODO: allow server config
app.listen(8000);
console.log('MEGA streaming on port 8000');