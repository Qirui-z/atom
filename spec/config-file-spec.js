const {it, fit, ffit, beforeEach, afterEach, conditionPromise} = require('./async-spec-helpers')
const fs = require('fs-plus')
const temp = require('temp').track()
const dedent = require('dedent')
const ConfigFile = require('../src/config-file')

describe('ConfigFile', () => {
  let filePath, configFile, subscription

  beforeEach(async () => {
    jasmine.useRealClock()
    filePath = temp.openSync({suffix: 'config.cson'}).path
    configFile = new ConfigFile(filePath)
    subscription = await configFile.watch()
  })

  afterEach(() => {
    subscription.dispose()
  })

  describe('when the file is empty', () => {
    it('returns an empty object from .get()', () => {
      expect(configFile.get()).toEqual({})
    })
  })

  describe('when the file is updated with valid CSON', () => {
    it('notifies onDidChange observers with the data', async () => {
      fs.writeFileSync(filePath, dedent(`
        '*':
          foo: 'bar'

        'javascript':
          foo: 'baz'
      `.trim()))

      const event = await new Promise(resolve => configFile.onDidChange(resolve))
      expect(event).toEqual({
        '*': {foo: 'bar'},
        'javascript': {foo: 'baz'}
      })

      expect(configFile.get()).toEqual({
        '*': {foo: 'bar'},
        'javascript': {foo: 'baz'}
      })
    })
  })

  describe('when the file is  updated with invalid CSON', () => {
    it('notifies onDidError observers', async () => {
      fs.writeFileSync(filePath, dedent `
        um what?
      `)

      const message = await new Promise(resolve => configFile.onDidError(resolve))
      expect(message).toEqual('Failed to parse config file')

      fs.writeFileSync(filePath, dedent `
        '*':
          foo: 'bar'

        'javascript':
          foo: 'baz'
      `)

      const event = await new Promise(resolve => configFile.onDidChange(resolve))
      expect(event).toEqual({
        '*': {foo: 'bar'},
        'javascript': {foo: 'baz'}
      })
    })
  })
})
