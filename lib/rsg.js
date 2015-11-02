require('babel/register')

var path = require('path')
var fs = require('fs-extra')
var assign = require('object-assign')
var browserify = require('browserify')
var babelify = require('babelify')
var glob = require('glob')
var mustache = require('mustache')
var reactDocGen = require('react-docgen')
var watchify = require('watchify')

/**
 * React Styleguide Generator
 *
 * @class
 * @param {string} input
 * @param {Object} opts
 * @param {string=} opts.output
 * @param {string=} opts.title
 * @param {string=|Object} opts.config
 * @param {string=} opts.root
 * @param {boolean=} opts.pushstate
 * @param {string[]=} opts.files
 * @param {Object=} opts.babelConfig
 * @param {Object=} opts.browserifyConfig
 * @param {Object=} opts.reactDocgen
 * @param {Object=} opts.typekit
 */
function RSG (input, opts) {
  opts = opts || {}

  this.log = require('./logger')('rsg-lib', { debug: opts.verbose || false })

  var config

  // If feeding in a direct config object
  if (opts.config !== null && typeof opts.config === 'object') {
    config = opts.config
  } else {
    config = this.readConfig(opts.config)
  }

  opts = assign(config, opts)

  opts.output = path.resolve(process.cwd(), (opts.output || 'styleguide').replace(/\/+$/, ''))
  opts.title = opts.title || 'Style Guide'
  opts.root = opts.root ? path.normalize('/' + opts.root.replace(/\/+$/, '')) : null
  opts.pushstate = opts.pushstate || false
  opts.files = opts.files || []
  opts.babelConfig = opts.babelConfig || { stage: 0 }
  opts.browserifyConfig = assign({ debug: true }, opts.browserifyConfig, {
    cache: {},
    packageCache: {},
    standalone: 'Contents'
  })

  this.input = glob.sync(input, { realpath: true })

  opts['reactDocgen'] = opts['reactDocgen'] || {}

  if (!opts['reactDocgen'].files) {
    opts['reactDocgen'].files = [input]
  }

  this.opts = opts
  this.reactVersion = require('react').version

  // stores prop documentation generated from react-docgen
  this.reactPropMetas = {}

  // files to parse for react-docgen
  this.reactDocGenFiles = this.getReactPropDocFiles()

  // Cache of file modification times so we're not re-parsing
  // files that have not changed in react-docgen for perf
  this.reactDocGenCache = {}

  // has the first-pass of parsing happened?
  this.reactDocGenInit = false

  // Cached files to include into the styleguide app
  this.cssFiles = this.extractFiles('.css')
  this.jsFiles = this.extractFiles('.js')

  this.appTemplate = fs.readFileSync(path.resolve(__dirname, './fixtures/index.html.mustache'), 'utf-8')
}

RSG.prototype.readConfig = function (file) {
  file = file === undefined ? 'styleguide.json' : file

  if (!file) { return {} }

  var src = process.cwd() + '/' + file

  this.log.info({ configFile: src }, 'Reading config file')

  return fs.existsSync(src) ? fs.readJsonSync(src) : {}
}

RSG.prototype.getReactPropDocFiles = function () {
  var files = this.opts['reactDocgen'].files
  var fileList = []

  files.forEach(function (file) {
    fileList = fileList.concat(glob.sync(file, { realpath: true }))
  })

  // remove dupes
  return fileList.filter(function (elem, pos) {
    return fileList.indexOf(elem) === pos
  })
}

RSG.prototype.genReactPropDoc = function () {
  var self = this

  return new Promise(function (resolve, reject) {

    self.reactDocGenFiles.forEach(function (file) {
      try {

        var fileStat = fs.statSync(file)

        // If we do not have the file in our cache, or the mod time has changed, parse the file
        if (!self.reactDocGenCache[file] || self.reactDocGenCache[file] && self.reactDocGenCache[file] !== fileStat.mtime) {
          var srcData = fs.readFileSync(file)

          var propMetadata = reactDocGen.parse(srcData)

          var displayName = propMetadata.displayName

          if (displayName) {
            // only check for duplicate displayNames on the first pass
            // subsequent passes, we can assume we're regenerating the prop information
            if (self.reactPropMetas[displayName] && !self.reactDocGenInit) {
              reject(new Error('displayName already exists: ' + displayName))
            } else {
              self.reactPropMetas[displayName] = propMetadata
            }
          }

          self.reactDocGenCache[file] = fileStat.mtime
        }

      } catch (e) {
        // self.log.error(e, 'react-docgen error processing: %s', file)
      }

    })

    self.reactDocGenInit = true

    resolve()
  })
}

RSG.prototype.copy = function (src, dest) {
  return new Promise(function (resolve, reject) {
    fs.copy(src, dest, function (err) {
      if (err) { return reject(err) }
      resolve()
    })
  })
}

RSG.prototype.copyAppFiles = function () {
  var src = path.resolve(__dirname, '../dist')
  var dest = this.opts.output + '/src'

  return this.copy(src, dest)
}

RSG.prototype.extractFiles = function (ext) {
  return this.opts.files
    .filter(function (file) { return path.extname(file) === ext });
 }

RSG.prototype.createHtmlFile = function () {
  this.genReactPropDoc().then(function () {
    var data = assign({}, this.opts, {
      hashbang: this.opts.pushstate ? 'false' : 'true',
      reactVersion: this.reactVersion,
      cssFils: this.cssFiles,
      jsFils: this.jsFiles,
      propMetas: JSON.stringify(this.reactPropMetas),
      typekit: this.opts.typekit
    })

    var dest = this.opts.output + '/index.html'
    var rendered = mustache.render(this.appTemplate, data)

    return new Promise(function (resolve, reject) {
      fs.outputFile(dest, rendered, function (err) {
        if (err) { return reject(err) }
        resolve()
      })
    })
  }.bind(this))
}

RSG.prototype.createReactFile = function () {
  var dest = this.opts.output + '/src/react_' + this.reactVersion + '.js'

  if (fs.existsSync(dest)) { return Promise.resolve() }

  var b = browserify({ debug: true })
    .require('react')
    .require('react/addons')

  return new Promise(function (resolve, reject) {
    b.bundle(function (err, buffer) {
      if (err) { return reject(err) }

      fs.outputFile(dest, buffer, function (outputFileErr) {
        if (outputFileErr) { return reject(outputFileErr) }
        resolve()
      })
    })
  })
}

RSG.prototype.createContentsFile = function () {
  var self = this
  var contentsInter = this.opts.output + '/src/contents-inter.js'
  var dest = this.opts.output + '/src/contents.js'
  var data = this.input.map(function (file) {
      self.log.debug({ file: file }, 'styleguide input file')
      return "require('" + file + "')"
    }
  )

  data = 'module.exports = [' + data.join(',') + ']'
  fs.outputFileSync(contentsInter, data)

  var bundle = browserify(contentsInter, self.opts.browserifyConfig)

  bundle.transform(babelify.configure(self.opts.babelConfig))
    .external('react')
    .external('react/addons')

  function distContentsFile () {
    return new Promise(function (resolve, reject) {
      bundle.bundle(function (err, buffer) {
        if (err) { return reject(err) }

        fs.outputFile(dest, buffer, function (outputFileErr) {
          if (outputFileErr) { return reject(outputFileErr) }
          resolve()
        })

      })
    })
  }

  function watchedContentsFile () {
    self.log.info('styleguide watch mode enabled')
    bundle = watchify(bundle)

    return new Promise(function (resolve, reject) {
      bundle.bundle(function(err, buffer) {
        if (err) { return reject(err) }

        fs.outputFile(dest, buffer, function (outputFileErr) {
          if (outputFileErr) { return reject(outputFileErr) }
          resolve()
        })

      }).on('data', function() {});

      bundle.on('update', function () {
        self.log.info('styleguide updating')

        Promise.all([
          self.createHtmlFile(),
          distContentsFile()
        ]).then(function () {
        }).catch(function (err) {
          self.log.error(err, 'browserify update error')
        })
      })

      bundle.on('error', function (err) {
        self.log.error(err, 'browserify error')
      })

      bundle.on('time', function (time) {
        self.log.info('styleguide rebundled in ' + time + 'ms')
      })
    })
  }

  if (self.opts.watch) {
    return watchedContentsFile();
  } else {
    return distContentsFile()
  }

}

RSG.prototype.generate = function (cb) {
  cb = cb ? cb.bind(this) : function () {}

  return Promise
    .all([
      this.copyAppFiles(),
      this.createHtmlFile(),
      this.createReactFile(),
      this.createContentsFile()
    ])
    .then(function () { cb() })
    .catch(function (err) {
      this.log.error(err)
      cb(err)
    }.bind(this))
}

module.exports = function (input, opts) {
  return new RSG(input, opts)
}
