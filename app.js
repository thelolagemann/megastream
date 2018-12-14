/**
 * npm module deps
 */
const express = require('express');
const { File } = require('megajs');

/**
 * bootstrap express app
 */
const app = new express();


/**
 * various things 
 */
const baseMega = 'https://mega.nz/#';
const streamableContainers = [
  'mkv',
  'mp4',
  'webm'
];

/**
 * helpers
 */
const genFolderJSON = (req, folder, child) => {
  return folder.map((file, i) => {
    console.log(file)
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
app.get('/stream/:link?', (req, res) => {
  const file = File.fromURL(baseMega + req.params.link);
  let fileSize = null;

  // init requests interval var
  let streamTimer;

  // increment current requests
  currentReq++

  // close event handler
  req.on('close', () => {
    if (lastReq == currentReq) {
      isStreaming = false
      currentReq = 0
      lastReq = 0
    }

    lastReq = currentReq
  })
  

  file.loadAttributes((err, data) => {
    if (err) res.writeHead(500).send(err)

    // Handle current stream
    if (currentStream !== data.name) {
      console.log(`Streaming ${data.name} to ${req.headers['user-agent']} via ${req.protocol}`)
      currentStream = data.name
    }

    // Assign true filesize from mega file
    fileSize = data.size;
    
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;


      res.writeHead(206, genHeaders(start, end, fileSize, chunkSize));
      const dlPipe = file.download({start, end, maxConnections: 1})
  
      // create 5 second interval to watch for stream end
      streamTimer = setInterval(() => {
        if (!isStreaming) {
          dlPipe.emit('close')
          clearInterval(streamTimer)
        }
      }, 5000)

      dlPipe.pipe(res)
    } else {
      const head = {
        'Content-Length': fileSize,
        'type': 'video/mp4'
      };
      res.writeHead(206, head);
      file.download({start: 0, end: 1024 * 1024, maxConnections: 1}).pipe(res)
    }

    isStreaming = true
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

app.listen(8000)
console.log('MEGA streaming on port 8000')