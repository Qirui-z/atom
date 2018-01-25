const fs = require('fs-plus')
const _ = require('underscore-plus')
const dedent = require('dedent')
const {Emitter, Disposable} = require('event-kit')
const {watchPath} = require('./path-watcher')
const CSON = require('season')
const Path = require('path')

const EVENT_TYPES = new Set([
  'created',
  'modified',
  'renamed'
])

module.exports =
class ConfigFile {
  constructor (path) {
    this.path = path
    this.requestLoad = _.debounce(() => this.reload(), 100)
    this.emitter = new Emitter()
    this.value = null
  }

  get () {
    return this.value
  }

  update (value) {
    return new Promise((resolve, reject) =>
      CSON.writeFile(this.path, value, error => {
        if (error) {
          reject(error)
        } else {
          this.value = value
          resolve()
        }
      })
    )
  }

  async watch (callback) {
    try {
      const result = watchPath(this.path, {}, events => {
        if (events.some(event => EVENT_TYPES.has(event.action))) this.reload()
      })
      await this.reload()
      return result
    } catch (error) {
      this.emit('did-error', dedent `
        Unable to watch path: \`${Path.basename(this.path)}\`.

        Make sure you have permissions to \`${this.path}\`.
        On linux there are currently problems with watch sizes.
        See [this document][watches] for more info.

        [watches]:https://github.com/atom/atom/blob/master/docs/build-instructions/linux.md#typeerror-unable-to-watch-path\
      `)
    }
  }

  onDidChange (callback) {
    return this.emitter.on('did-change', callback)
  }

  onDidError (callback) {
    return this.emitter.on('did-error', callback)
  }

  reload () {
    return new Promise(resolve => {
      CSON.readFile(this.path, (error, data) => {
        if (error) {
          console.error('cson error')
          console.error(error)
          this.emitter.emit('did-error', `Failed to load \`${Path.basename(this.path)}\` - ${error.message}`)
        } else {
          console.log('cson data')
          this.value = data || {}
          console.log(this.value)
          this.emitter.emit('did-change', this.value)
        }
        resolve()
      })
    })
  }
}
