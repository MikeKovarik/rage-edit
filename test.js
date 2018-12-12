const {Registry} = require('./index.js')
const {assert} = require('chai')


// I don't know why chai doesn't have this
assert.isError = (maybeErr, message = 'expected to be error') => {
	assert.instanceOf(maybeErr, Error, message)
}
assert.isNotError = (maybeErr, message = 'expected to not be error') => {
	if (maybeErr !== undefined)
		assert.isFalse(maybeErr instanceof Error, message)
}
assert.willThrow = async promise => {
	assert.isError(await promise.catch(err => err), 'expected to throw')
}
assert.willNotThrow = async promise => {
	assert.isNotError(await promise.catch(err => err), 'expected to not throw')
}

const isNode64bit    = (process.arch == 'x64')
const isNode64bitMsg = 'this test can be passed on x64 node.js only'

const PATH             = 'HKLM\\SOFTWARE\\MikeKovarik'
const PATH_32BIT       = 'HKLM\\SOFTWARE\\WOW6432Node\\MikeKovarik'
const PATH_NONEXISTENT = 'HKCR\\Some\\made\\up\\path\\that\\doesnt\\exist'
const PATH_BLOCK       = 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Shell Extensions\\Blocked'
const OW_PATH          = 'HKLM\\SOFTWARE\\Overwatch'
const BW_PATH          = 'HKLM\\SOFTWARE\\Overwatch\\Blackwatch'

function noop() {}
var resolveError = err => err
var genUID = () => `${Date.now()}-${process.hrtime().join('')}`

// Wrappers for tests
var getOpts = Registry._argsToOpts
var getKey = (...args) => Registry.getKey(getOpts(...args))
var getKeys = (...args) => Registry.getKeys(getOpts(...args))
var getValue = (...args) => Registry.getValue(getOpts(...args))
var getValues = (...args) => Registry.getValues(getOpts(...args))
var hasKey = (...args) => Registry.hasKey(getOpts(...args))
var hasValue = (...args) => Registry.hasValue(getOpts(...args))
var deleteKey = (...args) => Registry.deleteKey(getOpts(...args))
var deleteValue = (...args) => Registry.deleteValue(getOpts(...args))
var clearKeys = (...args) => Registry.clearKeys(getOpts(...args))
var clearValues = (...args) => Registry.clearValues(getOpts(...args))
var setKey = (...args) => Registry.setKey(getOpts(...args))
var setValue = (...args) => Registry.setValue(getOpts(...args))

async function cleanUpRegistry() {
	await Registry.delete(PATH)
	await Registry.delete(PATH_32BIT)
	await Registry.delete(OW_PATH)
}

// Registry.debug = true

describe('Registry static', () => {

	after(cleanUpRegistry)

	describe('Internal', () => {

		describe('.getOptions', () => {

			it('returns valid values if called without arguments', async () => {
				var options = getOpts()
				assert.equal(options.path, undefined)
				assert.equal(options.name, undefined)
				assert.equal(options.data, undefined)
				assert.equal(options.type, undefined)
				assert.equal(options.lowercase, true)
				assert.equal(options.format, Registry.format)
				assert.equal(options.bits, null)
			})

			it('allows both forwardslashes and backslashes', async () => {
				var backslashes = getOpts('HKLM\\SOFTWARE\\MikeKovarik').path
				var forwardslashes = getOpts('HKLM/SOFTWARE/MikeKovarik').path
				assert.equal(forwardslashes, 'HKLM\\SOFTWARE\\MikeKovarik')
				assert.equal(backslashes, forwardslashes)
			})

			it(`converts 'bits' to 'bitsArgs `, async () => {
				var bits64 = getOpts({bits: 64}).bitsArg
				var bits32 = getOpts({bits: 32}).bitsArg
				var bitsNull = getOpts({bits: 47}).bitsArg
				assert.equal(bits64, '/reg:64')
				assert.equal(bits32, '/reg:32')
				assert.equal(bitsNull, undefined)
			})

			it('converts arguments in proper order', async () => {
				var NAME = 'name'
				var DATA = 'value'
				var TYPE = 'REG_SZ'
				var FORMAT = Registry.format
				var options = getOpts(PATH, NAME, DATA, {type: TYPE, format: FORMAT})
				assert.equal(options.path, PATH)
				assert.equal(options.name, NAME)
				assert.equal(options.data, DATA)
				assert.equal(options.type, TYPE)
				assert.equal(options.format, FORMAT)
			})

			it('keeps custom options', async () => {
				var options = getOpts({somethingNew: 123})
				assert.equal(options.somethingNew, 123)
			})

		})

		describe('Unicode mode', () => {

			var cp

			before(async () =>  {
				cp = await Registry.getCodePage()
			})

			after(async () =>  {
				await Registry.setCodePage(cp)
			})

			it('can change code page', async () => {
				await Registry.setCodePage(437)
				assert.equal(await Registry.getCodePage(), 437)
				await Registry.setCodePage(65001)
				assert.equal(await Registry.getCodePage(), 65001)
				await Registry.setCodePage(cp)
				assert.equal(await Registry.getCodePage(), cp)
			})

			it('.enableUnicode', async () => {
				assert.equal(Registry.lastCodePage, undefined)
				var enabled = await Registry.enableUnicode()
				assert.isTrue(enabled)
				assert.equal(Registry.lastCodePage, cp)
			})

			it(`can't call .enableUnicode twice`, async () => {
				var enabled = await Registry.enableUnicode()
				assert.isFalse(enabled)
			})

			it('.disableUnicode', async () => {
				assert.equal(Registry.lastCodePage, cp)
				await Registry.disableUnicode()
				assert.equal(Registry.lastCodePage, undefined)
			})

			it(`can't call .disableUnicode twice`, async () => {
				var enabled = await Registry.disableUnicode()
				assert.isFalse(enabled)
			})

		})

	})

	describe('.getKeys', () => {

		it('is function', async () => {
			assert.isFunction(getKeys)
		})

		it('returns undefined if the key path does not exist', async () => {
			var keys = await getKeys(PATH_NONEXISTENT)
			assert.equal(keys, undefined)
		})

		it('returns an array', async () => {
			var keys = await getKeys('HKCR\\Directory\\Background')
			assert.isArray(keys)
		})

		it('accepts full hive names', async () => {
			var keys = await getKeys('HKEY_CLASSES_ROOT\\Directory\\Background')
			assert.isArray(keys)
		})

		it('returns empty array if no subkeys', async () => {
			// note: .txt pobably always has ShellNew subkey. It's best bet for writing test without
			// having to employ other methods like setKey()
			var keys = await getKeys('HKCR\\.txt\\ShellNew')
			assert.isEmpty(keys)
		})

		it('returned array should contain subkeys', async () => {
			var keys = await getKeys('HKCR\\Directory\\Background')
			for (var item of keys) {
				assert.isFalse(item.toUpperCase().startsWith('HKEY_CLASSES_ROOT'))
			}
			assert.include(keys, 'shell')
			assert.include(keys, 'shellex')
		})

		it('returns an array of lowercase subkeys by default', async () => {
			var keys = await getKeys('HKCR\\Directory\\Background\\shellex')
			assert.isNotEmpty(keys)
			assert.include(keys, 'contextmenuhandlers')
		})

		it('returns an array of case sensitive subkeys if requested', async () => {
			var keys = await getKeys('HKCR\\Directory\\Background\\shellex', {lowercase: false})
			assert.isNotEmpty(keys)
			assert.include(keys, 'ContextMenuHandlers')
		})

		it('returns different values in 64bit and 32bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			var path = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'

			var keys64 = await getKeys(path, {bits: 64})
			var keys32 = await getKeys(path, {bits: 32})

			assert.isNotEmpty(keys64)
			assert.isNotEmpty(keys32)

			assert.notSameMembers(keys64, keys32)
		})

		it('returns same values for 32bit mode and WOW6432Node key', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			var path = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
			var pathWow = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall'

			var keys32 = await getKeys(path, {bits: 32})
			var keysWow = await getKeys(pathWow)

			assert.isNotEmpty(keys32)
			assert.isNotEmpty(keysWow)

			assert.sameMembers(keys32, keysWow)
		})

		describe('complex form', () => {

			it('returns an array of strings', async () => {
				var keys = await getKeys('HKCR\\Directory\\Background', {format: 'complex'})
				assert.isArray(keys)
				assert.isNotEmpty(keys)
				var item = keys[0]
				assert.isString(item)
			})

			it('subkeys start with long hive names', async () => {
				var keys = await getKeys('HKCR\\Directory\\Background', {format: 'complex'})
				for (var item of keys) {
					assert.isTrue(item.toUpperCase().startsWith('HKEY_CLASSES_ROOT'))
				}
			})

			it('includes correct subkeys', async () => {
				var keys = await getKeys('HKCR\\Directory\\Background', {format: 'complex'})
				keys = keys.map(key => key.split('\\').pop())
				assert.include(keys, 'shell')
				assert.include(keys, 'shellex')
			})

			it('includes correct subkeys 2', async () => {
				var keys = await getKeys('HKCR\\Directory\\Background\\shellex', {format: 'complex'})
				keys = keys.map(path => path.toLowerCase())
				assert.include(keys, 'hkey_classes_root\\directory\\background\\shellex\\contextmenuhandlers')
			})

		})

	})



	describe('.getValues', () => {

		it('is function', async () => {
			assert.isFunction(getValues)
		})

		it('returns undefined if the key path does not exist', async () => {
			var values = await getValues(PATH_NONEXISTENT)
			assert.equal(values, undefined)
		})

		it('returns an object', async () => {
			var values = await getValues('HKCR\\*')
			assert.isObject(values)
		})

		it('returns empty object if no entries', async () => {
			var values = await getValues('HKCR\\*\\shell')
			assert.isEmpty(values)
		})

		it('undefined values should be properly recognized as undefined', async () => {
			var values = await getValues('HKCR\\*')
			assert.equal(values[''], undefined)
		})

		it('empty string values should be properly recognized as empty string', async () => {
			var values = await getValues('HKCR\\*')
			assert.equal(values['alwaysshowext'], '')
		})


		// NOTE: paths and value names are key insensitive and whenever its queries
		// reg command will always respond. But when 
		it('value name is case insensitive by default', async () => {
			var result = await getValues('HKCR\\*')
			assert.exists(result['alwaysshowext'])
			result = await getValues('HKCR\\*')
			assert.notExists(result['AlwaysShowExt'])
		})

		it('can be switched to case sensitive', async () => {
			var result = await getValues('HKCR\\*', {lowercase: false})
			assert.exists(result['AlwaysShowExt'])
			result = await getValues('HKCR\\*', {lowercase: false})
			assert.notExists(result['alwaysshowext'])
		})

		it('returns different values in 64bit and 32bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			var path = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Shared Tools\\Msinfo'

			var values64 = await getValues(path, {bits: 64})
			var values32 = await getValues(path, {bits: 32})

			assert.isNotEmpty(values64)
			assert.isNotEmpty(values32)

			assert.notEqual(values64.path, values32.path)
		})

		it('returns same values for 32bit mode and WOW6432Node key', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			var path = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Shared Tools\\Msinfo'
			var pathWow = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Shared Tools\\Msinfo'

			var valuesWow = await getValues(pathWow)
			var values32 = await getValues(path, {bits: 32})

			assert.isNotEmpty(valuesWow)
			assert.isNotEmpty(values32)

			assert.equal(valuesWow.path, values32.path)
		})



		describe('complex form', () => {

			it('returns an array of objects', async () => {
				var values = await getValues('HKCR\\*', {format: 'complex'})
				assert.isArray(values)
				var entry = values[0]
				assert.isObject(entry)
			})

			it('entries are represented by objects', async () => {
				var values = await getValues('HKCR\\*', {format: 'complex'})
				var entry = values[0]
				assert.isString(entry.name)
				assert.isTrue('data' in entry)
				assert.isString(entry.type)
			})

		})

	})


	describe('.getValue', () => {

		it('is function', async () => {
			assert.isFunction(getValue)
		})

		it('returns undefined if the key path does not exist', async () => {
			var result = await getValue(PATH_NONEXISTENT)
			assert.equal(result, undefined)
		})

		it('returns value of default entry', async () => {
			var result = await getValue('HKCR\\Directory', '')
			assert.equal(result, 'File Folder')
		})

		it('omitted second argument (name) falls back to default name (empty string)', async () => {
			var result = await getValue('HKCR\\Directory')
			assert.equal(result, 'File Folder')
		})

		it('returns empty string if the value entry has empty string data', async () => {
			var result = await getValue('HKCR\\*', 'alwaysshowext')
			assert.equal(result, '')
		})

		it('returns string if the value entry has string data', async () => {
			var result = await getValue('HKCR\\*', 'AlwaysShowExt')
			assert.isString(result)
		})

		// NOTE: reg command is insensitive 
		it('value name is case insensitive by default', async () => {
			var result = await getValue('HKCR\\*', 'AlwaysShowExt')
			assert.exists(result)
			result = await getValue('HKCR\\*', 'alwaysshowext')
			assert.exists(result)
		})

		//it('can be switched to case sensitive', async () => {
		//	var result = await getValue('HKCR\\*', 'AlwaysShowExt', true)
		//	assert.exists(result)
		//	result = await getValue('HKCR\\*', 'alwaysshowext', true)
		//	assert.notExists(result)
		//})

		it('returns undefined if the value entry exists, but does not value any data', async () => {
			var result = await getValue('HKCR\\*', '')
			assert.equal(result, undefined)
		})

		it('returns different values in 64bit and 32bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			var path = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Shared Tools\\Msinfo'

			var value64 = await getValue(path, 'path', {bits: 64})
			var value32 = await getValue(path, 'path', {bits: 32})

			assert.notEqual(value64, value32)
		})

		it('returns same values for 32bit mode and WOW6432Node key', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)
 
			var path = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Shared Tools\\Msinfo'
			var pathWow = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Shared Tools\\Msinfo'

			var valueWow = await getValue(pathWow, 'path')
			var value32 = await getValue(path, 'path', {bits: 32})

			assert.equal(valueWow, value32)
		})


		describe('output type casting', () => {

			it('reads REG_SZ as string', async () => {
				var NAME = 'casting-1'
				await setValue(PATH, NAME, 'some string', {type: 'REG_SZ'})
				assert.isString(await getValue(PATH, NAME))
			})

			it('reads REG_DWORD as number', async () => {
				var NAME = 'casting-2'
				await setValue(PATH, NAME, 1234, {type: 'REG_DWORD'})
				assert.isNumber(await getValue(PATH, NAME))
			})

			it('reads REG_QWORD as BigInt', async () => {
				var NAME = 'casting-3'
				await setValue(PATH, NAME, 1234, {type: 'REG_QWORD'})
				var data = await getValue(PATH, NAME)
				assert.equal(data.constructor.name, 'BigInt')
			})

			it('reads REG_QWORD as string in 0x format if BigInt is not supported', async () => {
				var NAME = 'casting-4'
				await setValue(PATH, NAME, 1234, {type: 'REG_QWORD'})
				var BigIntOrginal = BigInt
				BigInt = undefined
				var data = await getValue(PATH, NAME)
				BigInt = BigIntOrginal
				assert.isString(data)
				assert.isTrue(data.startsWith('0x'))
			})

			it('reads REG_BINARY as buffer', async () => {
				var NAME = 'casting-5'
				await setValue(PATH, NAME, Buffer.alloc(0), {type: 'REG_BINARY'})
				var data = await getValue(PATH, NAME)
				assert.equal(data.constructor.name, 'Buffer')
			})

			it('reads REG_MULTI_SZ as array', async () => {
				var NAME = 'casting-6'
				await setValue(PATH, NAME, [], {type: 'REG_MULTI_SZ'})
				assert.isArray(await getValue(PATH, NAME))
			})

			it('string to REG_BINARY', async () => {
				var NAME = 'binary-value'
				var buffer = Buffer.from('Experience tranquility')
				await deleteValue(PATH, NAME)
				await setValue(PATH, NAME, buffer.toString(), {type: 'REG_BINARY'})
				var {data, type} = await getValue(PATH, NAME, {format: 'complex'})
				assert.equal(type, 'REG_BINARY')
				assert.equal(data.toString(), buffer.toString())
			})

		})

		describe('complex form', () => {

			it('returns an object', async () => {
				var entry = await getValue('HKCR\\*', 'AlwaysShowExt', {format: 'complex'})
				assert.isObject(entry)
			})

			it(`has 'name', 'type' and 'data' fields`, async () => {
				var entry = await getValue('HKCR\\*', 'AlwaysShowExt', {format: 'complex'})
				assert.isString(entry.name)
				assert.isTrue('data' in entry)
				assert.isString(entry.type)
			})

		})

	})




	describe('.getKey', () => {

		it('is function', async () => {
			assert.equal(typeof getKey, 'function')
		})

		it('returns undefined if the key path does not exist', async () => {
			var result = await getKey(PATH_NONEXISTENT)
			assert.equal(typeof result, 'undefined')
		})

		it('returns lowercase keys', async () => {
			var result = await getKey('HKCR\\Directory\\shellex', {lowercase: true})
			assert.isObject(result['contextmenuhandlers'])
			assert.notExists(result['ContextMenuHandlers'])
		})

		it('can return case sensitive keys', async () => {
			var result = await getKey('HKCR\\Directory\\shellex', {lowercase: false})
			assert.isObject(result['ContextMenuHandlers'])
			assert.notExists(result['contextmenuhandlers'])
		})

		it('returns different values in 64bit and 32bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			var path = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Shared Tools\\Msinfo'

			var key64 = await getKey(path, {bits: 64})
			var key32 = await getKey(path, {bits: 32})

			assert.isNotEmpty(key64)
			assert.isNotEmpty(key32)

			assert.notEqual(key64.$values.path, key32.$values.path)
		})

		it('returns same values for 32bit mode and WOW6432Node key', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			var path = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Shared Tools\\Msinfo'
			var pathWow = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Shared Tools\\Msinfo'

			var keyWow = await getKey(pathWow)
			var key32 = await getKey(path, {bits: 32})

			assert.isNotEmpty(keyWow)
			assert.isNotEmpty(key32)

			assert.equal(keyWow.$values.path, key32.$values.path)
		})

		describe('simple format', () => {

			it('returns simple format', async () => {
				var result = await getKey('HKCR\\Directory')
				assert.isObject(result)
				assert.isObject(result.$values)
			})

			it('has keys', async () => {
				var result = await getKey('HKCR\\Directory')
				assert.exists(result['background'])
				assert.exists(result['shell'])
				assert.exists(result['shellex'])
			})

			it('has values', async () => {
				var result = await getKey('HKCR\\Directory')
				assert.equal(result.$values[''], 'File Folder')
			})

			it('empty default value does show up in $values', async () => {
				await Registry.delete(OW_PATH)
				await Registry.set(OW_PATH, '')
				var result = await getKey(OW_PATH)
				assert.isNotEmpty(Object.keys(result.$values))
				assert.isTrue(Object.keys(result.$values).includes(''))
			})
			it('undefined default value does not show up in $values', async () => {
				await Registry.delete(OW_PATH)
				await Registry.set(OW_PATH)
				var result = await getKey(OW_PATH)
				assert.isEmpty(Object.keys(result.$values))
			})

			it('can work recursively', async () => {
				var result = await getKey('HKCR\\Directory\\Background', {recursive: true})
				assert.isObject(result['shellex'])
				assert.isObject(result['shellex']['contextmenuhandlers'])
			})

		})

		describe('complex format', () => {

			it('returns complex format', async () => {
				var result = await getKey('HKCR\\Directory', {format: 'complex'})
				assert.isObject(result)
				assert.isObject(result.keys) // TODO
				assert.isArray(result.values)
			})

			it('has keys', async () => {
				var result = await getKey('HKCR\\Directory', {format: 'complex'})
				assert.exists(result.keys['background'])
				assert.exists(result.keys['shell'])
				assert.exists(result.keys['shellex'])
			})

			it('has values', async () => {
				var result = await getKey('HKCR\\Directory', {format: 'complex'})
				var defaultEntry = result.values.filter(entryObject => entryObject.name === '')[0]
				assert.isObject(defaultEntry)
				assert.equal(defaultEntry.name, '')
				assert.equal(defaultEntry.data, 'File Folder')
				assert.equal(defaultEntry.type, 'REG_SZ')
			})

			it('empty default value does show up in $values', async () => {
				await Registry.delete(OW_PATH)
				await Registry.set(OW_PATH, '')
				var result = await getKey(OW_PATH, {format: 'complex'})
				assert.isNotEmpty(result.values)
				assert.isTrue(result.values[0].name === '')
			})
			it('undefined default value does not show up in $values', async () => {
				await Registry.delete(OW_PATH)
				await Registry.set(OW_PATH)
				var result = await getKey(OW_PATH, {format: 'complex'})
				assert.isEmpty(result.values)
			})

			it('can work recursively', async () => {
				var result = await getKey('HKCR\\Directory\\Background', true, {format: 'complex', recursive: true})
				assert.isObject(result.keys['shellex'])
				assert.isObject(result.keys['shellex'].keys)
				assert.isObject(result.keys['shellex'].keys['contextmenuhandlers'])
			})

		})


	})




	describe('.get', () => {

		it('is function', async () => {
			assert.isFunction(Registry.get)
		})

		it('returns undefined if the key path does not exist', async () => {
			var result = await Registry.get(PATH_NONEXISTENT)
			assert.equal(result, undefined)
		})

		it('only using one parameter serves as alias for .getKey', async () => {
			var result = await Registry.get('HKCR\\*')
			assert.isObject(result)
			assert.isString(result.$values['alwaysshowext'])
		})

		it('using two parameters serves as alias for .getValue', async () => {
			var result = await Registry.get('HKCR\\*', 'alwaysshowext')
			assert.isString(result)
		})

		it('works using 64bit and 32bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			var path = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Shared Tools\\Msinfo'

			var value64 = await Registry.get(path, 'path', {bits: 64})
			var value32 = await Registry.get(path, 'path', {bits: 32})

			assert.isNotEmpty(value64)
			assert.isNotEmpty(value32)

			assert.notEqual(value64, value32)
		})

	})


	describe('.hasKey', () => {

		it('is function', async () => {
			assert.isFunction(hasKey)
		})

		it('returns true if key at given path exists', async () => {
			assert.isTrue(await hasKey('HKLM\\SOFTWARE'))
		})

		it(`returns false if key at given path doesn't exist`, async () => {
			assert.isFalse(await hasKey(PATH_NONEXISTENT))
		})
		
		it('checks different keys in 64bit and 32bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			await Registry.delete(PATH)
			await Registry.delete(PATH_32BIT)
			await setKey(PATH)

			assert.isTrue(await hasKey(PATH, {bits: 64}))
			assert.isFalse(await hasKey(PATH, {bits: 32}))

			await Registry.delete(PATH)
			await setKey(PATH_32BIT)

			assert.isFalse(await hasKey(PATH, {bits: 64}))
			assert.isTrue(await hasKey(PATH, {bits: 32}))
		})

	})


	describe('.hasValue', () => {

		it('is function', async () => {
			assert.isFunction(hasValue)
		})

		it('returns true if value entry exists at given path', async () => {
			assert.isTrue(await hasValue('HKCR\\*', 'AlwaysShowExt'))
		})

		it(`returns false if value entry doesn't exist at given path`, async () => {
			assert.isFalse(await hasValue('HKCR\\*', 'foo-bar non existent'))
		})

		it('checks different values in 64bit and 32bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			var value64 = `reg-mode-64-bit-${genUID()}`
			var value32 = `reg-mode-32-bit-${genUID()}`

			await setValue(PATH, value64, 'yes', {type: 'REG_SZ'})
			await setValue(PATH_32BIT, value32, 'yes', {type: 'REG_SZ'})

			assert.isTrue(await hasValue(PATH, value64, {bits: 64}))
			assert.isTrue(await hasValue(PATH, value32, {bits: 32}))
			
			assert.isFalse(await hasValue(PATH, value64, {bits: 32}))
			assert.isFalse(await hasValue(PATH, value32, {bits: 64}))
		})

	})


	describe('.has', () => {

		it('is function', async () => {
			assert.isFunction(Registry.has)
		})

		it('returns true if key at given path exists', async () => {
			assert.isTrue(await Registry.has('HKLM\\SOFTWARE'))
		})

		it(`returns false if key at given path doesn't exist`, async () => {
			assert.isFalse(await Registry.has(PATH_NONEXISTENT))
		})

		it('returns true if value entry exists at given path', async () => {
			assert.isTrue(await Registry.has('HKCR\\*', 'AlwaysShowExt'))
		})

		it(`returns false if value entry doesn't exist at given path`, async () => {
			assert.isFalse(await Registry.has('HKCR\\*', 'foo-bar non existent'))
		})

		it('checks different keys in 64bit and 32bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)
				 
			var UID = genUID()
			var SUBPATH = `${PATH}\\Testing .has ${UID}`
			var SUBPATH_32BIT = `${PATH_32BIT}\\Testing .has ${UID}`

			await setKey(SUBPATH_32BIT)
			assert.isFalse(await Registry.has(SUBPATH, {bits: 64}))
			assert.isTrue(await Registry.has(SUBPATH, {bits: 32}))

			await setKey(SUBPATH)

			assert.isTrue(await Registry.has(SUBPATH, {bits: 64}))
		})

		it('checks different values in 64bit and 32bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			var value64 = `reg-mode-64-bit-${genUID()}`
			var value32 = `reg-mode-32-bit-${genUID()}`

			await setValue(PATH, value64, 'yes', {type: 'REG_SZ'})
			await setValue(PATH_32BIT, value32, 'yes', {type: 'REG_SZ'})

			assert.isTrue(await Registry.has(PATH, value64, {bits: 64}))
			assert.isFalse(await Registry.has(PATH, value32, {bits: 64}))

			assert.isTrue(await Registry.has(PATH, value32, {bits: 32}))
			assert.isFalse(await Registry.has(PATH, value64, {bits: 32}))
		})

	})


	describe('.deleteKey', () => {

		it('is function', async () => {
			assert.isFunction(deleteKey)
		})

		it('deletes the key at given path', async () => {
			await setKey(PATH)
			await deleteKey(PATH)
			assert.isFalse(await hasKey(PATH))
		})

		it('deletion of an existing key does not throw', async () => {
			await setKey(PATH)
			await assert.willNotThrow(deleteKey(PATH))
		})

		it('deletion of nonexisting key does not throw', async () => {
			await deleteKey(PATH_NONEXISTENT)
		})

		it('deletes different keys in 64bit and 32bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			await setKey(PATH)
			await setKey(PATH_32BIT)
			await deleteKey(PATH, {bits: 64})

			assert.isFalse(await hasKey(PATH))
			assert.isTrue(await hasKey(PATH_32BIT))

			await setKey(PATH)
			await deleteKey(PATH, {bits: 32})

			assert.isTrue(await hasKey(PATH))
			assert.isFalse(await hasKey(PATH_32BIT))
		})

	})


	describe('.deleteValue', () => {

		it('is function', async () => {
			assert.isFunction(deleteValue)
		})

		it('deletes the value at given path', async () => {
			const NAME = 'deleteme'
			await Registry.set(PATH, NAME, 'this is the value entry to be deleted')
			assert.isTrue(await hasValue(PATH, NAME))
			await deleteValue(PATH, NAME)
			assert.isFalse(await hasValue(PATH, NAME))
		})

		it('deletion of an existing value entry does not throw', async () => {
			const NAME = 'deleteme'
			await Registry.set(PATH, NAME, 'this is the value entry to be deleted')
			await assert.willNotThrow(deleteValue(PATH, NAME))
		})

		//it('deletion of nonexisting value entry throws', async () => {
		it('deletion of nonexisting value does not throw', async () => {
			const NAME = 'deleteme'
			await deleteValue(PATH, NAME).catch(noop)
			await deleteValue(PATH, NAME)
		})

		it('deletes different values in 64bit and 32bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			const NAME = 'deleteme'

			await Registry.set(PATH, NAME)
			await Registry.set(PATH_32BIT, NAME)
			await deleteValue(PATH, NAME, {bits: 64})

			assert.isFalse(await hasValue(PATH, NAME))
			assert.isTrue(await hasValue(PATH_32BIT, NAME))

			await Registry.set(PATH, NAME)
			await deleteValue(PATH, NAME, {bits: 32})

			assert.isTrue(await hasValue(PATH, NAME))
			assert.isFalse(await hasValue(PATH_32BIT, NAME))
		})

	})


	describe('.delete', () => {

		it('is function', async () => {
			assert.isFunction(Registry.delete)
		})

		it('only using one parameter serves as alias for .deleteKey', async () => {
			await setKey(PATH)
			assert.isTrue(await hasKey(PATH))
			await Registry.delete(PATH)
			assert.isFalse(await hasKey(PATH))
		})

		it('using two parameters serves as alias for .deleteValue', async () => {
			var NAME = 'deleteme'
			await Registry.set(PATH, NAME, 'Embrace the Iris')
			assert.isTrue(await hasKey(PATH))
			assert.isTrue(await hasValue(PATH, NAME))
			await Registry.delete(PATH, NAME)
			assert.isTrue(await hasKey(PATH))
			assert.isFalse(await hasValue(PATH, NAME))
		})

		it('deletes different keys in 64bit and 32bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			await setKey(PATH)
			await setKey(PATH_32BIT)
			await Registry.delete(PATH, {bits: 64})

			assert.isFalse(await hasKey(PATH))
			assert.isTrue(await hasKey(PATH_32BIT))

			await setKey(PATH)
			await Registry.delete(PATH, {bits: 32})

			assert.isTrue(await hasKey(PATH))
			assert.isFalse(await hasKey(PATH_32BIT))

		})

		it('deletes different values in 64bit and 32bit modes', async () => {
			const NAME = 'deleteme'

			await Registry.set(PATH, NAME)
			await Registry.set(PATH_32BIT, NAME)
			await Registry.delete(PATH, NAME, {bits: 64})

			assert.isFalse(await hasValue(PATH, NAME))
			assert.isTrue(await hasValue(PATH_32BIT, NAME))

			await Registry.set(PATH, NAME)
			await Registry.delete(PATH, NAME, {bits: 32})

			assert.isTrue(await hasValue(PATH, NAME))
			assert.isFalse(await hasValue(PATH_32BIT, NAME))
		})

	})



	describe('.setKey', () => {

		it('is function', async () => {
			assert.isFunction(setKey)
		})

		it('creates new key', async () => {
			const PATH = 'HKLM\\SOFTWARE\\MikeKovarik\\nonexistent'
			await deleteKey(PATH).catch(noop)
			await setKey(PATH)
			assert.isTrue(await hasKey(PATH))
		})

		it('overwrites already existing key', async () => {
			const PATH = 'HKLM\\SOFTWARE\\MikeKovarik\\existing'
			await setKey(PATH).catch(noop)
			await setKey(PATH)
			assert.isTrue(await hasKey(PATH))
		})

		it('creates different keys in 64bit and 32bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			await Registry.delete(PATH)
			await Registry.delete(PATH_32BIT)

			await setKey(PATH, {bits: 64})

			assert.isTrue(await hasKey(PATH))
			assert.isFalse(await hasKey(PATH_32BIT))

			await Registry.delete(PATH)

			await setKey(PATH, {bits: 32})

			assert.isFalse(await hasKey(PATH))
			assert.isTrue(await hasKey(PATH_32BIT))
		})

	})


	describe('.setValue', () => {

		async function getEntryType(NAME) {
			// get complex object
			var result = await getValue(PATH, NAME, {format: 'complex'})
			return result.type
		}

		it('is function', async () => {
			assert.isFunction(setValue)
		})

		it('creates new value entry', async () => {
			var NAME = 'value-entry-1'
			var DATA = 'this is the newly created value data'
			await deleteValue(PATH, NAME).catch(noop)
			assert.isFalse(await hasValue(PATH, NAME))
			await setValue(PATH, NAME, DATA)
			assert.equal(await getValue(PATH, NAME), DATA)
		})

		it('overwrites existing value entry', async () => {
			var NAME = 'value-entry-2'
			var INITIAL_DATA = 'initial data'
			var FINAL_DATA = 'expected final data'
			await setValue(PATH, NAME, INITIAL_DATA)
			assert.isTrue(await hasValue(PATH, NAME))
			await setValue(PATH, NAME, FINAL_DATA)
			assert.equal(await getValue(PATH, NAME), FINAL_DATA)
		})

		it(`creates empty REG_SZ value if the data argument isn't specified`, async () => {
			var NAME = 'LegacyDisable'
			await Registry.delete(OW_PATH, NAME)
			await setValue(OW_PATH, NAME)
			var value = await getValue(OW_PATH, NAME, {format: 'complex'})
			assert.equal(value.name, 'legacydisable')
			assert.equal(value.type, 'REG_SZ')
			assert.equal(value.data, '')
		})

		it(`also creates key if the path doesn't exist`, async () => {
			var NAME = 'nested-entry-1'
			var DATA = 'this is the newly created value data'
			await deleteKey(PATH + '\\deep', NAME).catch(noop)
			assert.isFalse(await hasKey(PATH + '\\deep'))
			await setValue(PATH + '\\deep\\sub\\key', NAME, DATA)
			assert.isTrue(await hasKey(PATH + '\\deep'))
		})

		it('creates different values in 64bit and 32bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			await Registry.delete(PATH)
			await Registry.delete(PATH_32BIT)

			await setValue(PATH, 'reg-mode', 'reg64bit', {type: 'REG_SZ', bits: 64})
			await setValue(PATH, 'reg-mode', 'reg32bit', {type: 'REG_SZ', bits: 32})

			assert.equal(await getValue(PATH, 'reg-mode'), 'reg64bit')
			assert.equal(await getValue(PATH_32BIT, 'reg-mode'), 'reg32bit')
		})

		it(`'options' don't conflict with 'type'`, async () => {
			await setValue(PATH_32BIT, 'value-entry-1', 123, {type: 'REG_DWORD'})
			await setValue(PATH, 'value-entry-2', 123, {bits: 64})
			await setValue(PATH, 'value-entry-3', 123, {bits: 32})
			await setValue(PATH, 'value-entry-4', 123, {type: 'REG_DWORD', bits: 32})

			var val1 = await getValue(PATH, 'value-entry-1', {bits: 32})
			var val2 = await getValue(PATH, 'value-entry-2', {bits: 64})
			var val3 = await getValue(PATH, 'value-entry-3', {bits: 32})
			var val4 = await getValue(PATH, 'value-entry-4', {bits: 32})

			assert.equal(val1, 123)
			assert.equal(val1, val2)
			assert.equal(val2, val3)
			assert.equal(val3, val4)

			assert.equal(await getEntryType('value-entry-2'), 'REG_DWORD')
		})


		describe('input data type inferring', () => {

			it('string as REG_SZ', async () => {
				var NAME = 'type-infer-1'
				await setValue(PATH, NAME, 'some string')
				assert.equal(await getEntryType(NAME), 'REG_SZ')
			})

			it('number as REG_DWORD', async () => {
				var NAME = 'type-infer-2'
				await setValue(PATH, NAME, 123)
				assert.equal(await getEntryType(NAME), 'REG_DWORD')
			})

			it('bigint as REG_QWORD', async () => {
				var NAME = 'type-infer-3'
				await setValue(PATH, NAME, 123n)
				assert.equal(await getEntryType(NAME), 'REG_QWORD')
			})

			it('array as REG_MULTI_SZ', async () => {
				var NAME = 'type-infer-4'
				await setValue(PATH, NAME, ['one', 'two', 'three'])
				assert.equal(await getEntryType(NAME), 'REG_MULTI_SZ')
			})

			it('buffer as REG_BINARY', async () => {
				var NAME = 'type-infer-5'
				await setValue(PATH, NAME, Buffer.from('Zenyatta'))
				assert.equal(await getEntryType(NAME), 'REG_BINARY')
			})

		})


		describe('storing and retrieving the same value', () => {

			it('REG_SZ string', async () => {
				var NAME = 'value-1'
				var DATA = 'some data'
				await setValue(PATH, NAME, DATA, {type: 'REG_SZ'})
				assert.equal(await getValue(PATH, NAME), DATA)
			})

			it('REG_DWORD number', async () => {
				var NAME = 'value-2'
				var DATA = 123
				await setValue(PATH, NAME, DATA, {type: 'REG_DWORD'})
				assert.equal(await getValue(PATH, NAME), DATA)
			})

			it('REG_DWORD string', async () => {
				var NAME = 'value-3'
				var DATA = '123'
				await setValue(PATH, NAME, DATA, {type: 'REG_DWORD'})
				assert.equal(await getValue(PATH, NAME), DATA)
			})

			it('REG_QWORD number', async () => {
				var NAME = 'value-4'
				var DATA = 123n
				await setValue(PATH, NAME, DATA, {type: 'REG_QWORD'})
				assert.equal(await getValue(PATH, NAME), DATA)
			})

			it('REG_QWORD number', async () => {
				var NAME = 'value-5'
				var DATA = 123n
				await setValue(PATH, NAME, DATA + '', {type: 'REG_QWORD'})
				assert.equal(await getValue(PATH, NAME), DATA)
			})

			it('REG_MULTI_SZ array', async () => {
				var NAME = 'value-6'
				var DATA = ['one', 'two', 'three']
				await setValue(PATH, NAME, DATA, {type: 'REG_MULTI_SZ'})
				var array = await getValue(PATH, NAME)
				assert.equal(array.length, DATA.length)
				assert.equal(array[0], DATA[0])
				assert.equal(array[1], DATA[1])
				assert.equal(array[2], DATA[2])
			})

			it('REG_MULTI_SZ string', async () => {
				var NAME = 'value-7'
				var DATA = 'one\0two\0three'
				await setValue(PATH, NAME, DATA, {type: 'REG_MULTI_SZ'})
				var array = await getValue(PATH, NAME)
				assert.equal(array.length, 3)
				assert.equal(array[0], 'one')
				assert.equal(array[1], 'two')
				assert.equal(array[2], 'three')
			})

			it('REG_BINARY', async () => {
				var NAME = 'value-8'
				var DATA = Buffer.from('Experience tranquility')
				await setValue(PATH, NAME, DATA, {type: 'REG_BINARY'})
				var buffer = await getValue(PATH, NAME)
				assert.equal(buffer.toString(), DATA.toString())
			})

		})


		describe('input data type override', () => {

			it('explicitly stores string as REG_DWORD', async () => {
				var NAME = 'type-override-1'
				await setValue(PATH, NAME, '123', {type: 'REG_DWORD'})
				assert.equal(await getEntryType(NAME), 'REG_DWORD')
			})

			it('explicitly stores string as REG_QWORD', async () => {
				var NAME = 'type-override-2'
				await setValue(PATH, NAME, '123', {type: 'REG_QWORD'})
				assert.equal(await getEntryType(NAME), 'REG_QWORD')
			})

			it('explicitly stores buffer as REG_SZ', async () => {
				var NAME = 'type-override-3'
				await setValue(PATH, NAME, Buffer.from('Zenyatta'), {type: 'REG_SZ'})
				assert.equal(await getEntryType(NAME), 'REG_SZ')
			})

			it('explicitly stores string as REG_BINARY', async () => {
				var NAME = 'type-override-4'
				var DATA = 'Experience tranquility'
				await setValue(PATH, NAME, 'Zenyatta', {type: 'REG_BINARY'})
				assert.equal(await getEntryType(NAME), 'REG_BINARY')
			})

		})


		describe('type name alias', () => {

			it('sz as REG_SZ', async () => {
				var NAME = 'value-entry-9'
				var DATA = '123'
				await setValue(PATH, NAME, DATA, 'sz')
				assert.equal(await getEntryType(NAME), 'REG_SZ')
			})

			it('dword as REG_DWORD', async () => {
				var NAME = 'value-entry-10'
				var DATA = 123
				await setValue(PATH, NAME, DATA, 'dword')
				assert.equal(await getEntryType(NAME), 'REG_DWORD')
			})

		})


	})


	describe('.set', () => {

		// todo

		it('is function', async () => {
			assert.isFunction(Registry.set)
		})

		// TODO in future

		it(`complex`, async () => {
			await Registry.delete(OW_PATH)
			await Registry.set(OW_PATH, {
				'': `Soldiers. Scientists. Adventurers. Oddities.`,
				leader: 'Jack Morrison',
				scientists: ['Angela Ziegler', 'Winston', 'Mei-Ling Zhou']
			})
			assert.isTrue(await Registry.has(OW_PATH))
			assert.isTrue(await Registry.has(OW_PATH, 'leader'))
			assert.equal((await Registry.get(OW_PATH, 'scientists')).length, 3)
		})

		it('creates different values in 64bit and 32bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			await Registry.delete(PATH)
			await Registry.delete(PATH_32BIT)

			await Registry.set(PATH, 'reg-mode', 'reg64bit', {bits: 64})
			await Registry.set(PATH, 'reg-mode', 'reg32bit', {bits: 32})

			assert.equal(await getValue(PATH, 'reg-mode'), 'reg64bit')
			assert.equal(await getValue(PATH_32BIT, 'reg-mode'), 'reg32bit')
		})

		it(`nested complex`, async () => {
			await Registry.delete(OW_PATH)
			await Registry.set(OW_PATH, {
				'': `Soldiers. Scientists. Adventurers. Oddities.`,
				leader: 'Jack Morrison',
				scientists: ['Angela Ziegler', 'Winston', 'Mei-Ling Zhou'],
				Blackwatch: {
					leader: 'Gabriel Reyes'
				}
			})
			assert.isTrue(await Registry.has(OW_PATH))
			assert.isTrue(await Registry.has(BW_PATH))
			assert.equal(await Registry.get(OW_PATH, 'leader'), 'Jack Morrison')
			assert.equal(await Registry.get(BW_PATH, 'leader'), 'Gabriel Reyes')
		})

		it(`last argument can be explicitly marked as options object (two arguments)`, async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			var SUBPATH = `${PATH}\\isOptions-tests`
			var SUBPATH_32BIT = `${PATH_32BIT}\\isOptions-tests`

			await Registry.delete(SUBPATH)
			await Registry.delete(SUBPATH_32BIT)

			await Registry.set(SUBPATH, {bits: 32})
			await Registry.set(SUBPATH, {bits: 32, [Registry.IS_OPTIONS]: true})

			assert.equal(await getValue(SUBPATH, 'bits'), 32)
			assert.isTrue(await hasKey(SUBPATH_32BIT))
			assert.notEqual(await getValue(SUBPATH_32BIT, 'bits'), 32)
		})

		it(`last argument can be explicitly marked as options object (three arguments)`, async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			var SUBKEY = 'deep-subpath'
			var SUBPATH = `${PATH}\\isOptions-tests`
			var SUBPATH_FULL = `${SUBPATH}\\${SUBKEY}`
			var SUBPATH_32BIT = `${PATH_32BIT}\\isOptions-tests`

			await Registry.delete(SUBPATH)
			await Registry.delete(SUBPATH_32BIT)

			await Registry.set(SUBPATH, SUBKEY, {bits: 32})
			await Registry.set(SUBPATH, SUBKEY, {bits: 32, [Registry.IS_OPTIONS]: true})

			assert.equal(await getValue(SUBPATH_FULL, 'bits'), 32)
			assert.isTrue(await hasValue(SUBPATH_32BIT), SUBKEY)
			assert.notEqual(await getValue(SUBPATH_32BIT, 'bits'), 32)
		})


	})


	describe('.clearValues', () => {

		it('is function', async () => {
			assert.isFunction(clearValues)
		})

		it('deletes all values at given path, except for the default one', async () => {
			await Registry.set(PATH, '', 'Experience tranquility')
			await Registry.set(PATH, 'val1', 'Embrace the Iris')
			//assert.isTrue(await hasKey(PATH))
			//assert.isTrue(await hasValue(PATH, ''))
			//assert.isTrue(await hasValue(PATH, 'val1'))
			await clearValues(PATH)
			assert.isTrue(await hasKey(PATH))
			assert.isTrue(await hasValue(PATH, ''))
			assert.isFalse(await hasValue(PATH, 'val1'))
			assert.equal(Object.keys(await getValues(PATH)).length, 0)
		})

		it('retains subkeys', async () => {
			await setKey(`${PATH}\\subkey`)
			await clearValues(PATH)
			assert.notEqual((await getKeys(PATH)).length, 0)
		})

	})


	describe('.clearKeys', () => {

		it('is function', async () => {
			assert.isFunction(clearKeys)
		})

		it('deletes all subkeys', async () => {
			await Registry.set(PATH + '\\subpath', 'val1', 'Embrace the Iris')
			await clearKeys(PATH)
			assert.equal(Object.keys(await getKeys(PATH)).length, 0)
		})

	})


	describe('.clear', () => {

		it('is function', async () => {
			assert.isFunction(Registry.clear)
		})

		it('deletes all values and subkeys', async () => {
			await Registry.set(PATH, 'val1', 'Embrace the Iris')
			await Registry.set(PATH + '\\subpath', 'val1', 'Embrace the Iris')
			await Registry.clear(PATH)
			var result = await Registry.get(PATH, {format: 'complex'})
			assert.equal(Object.keys(result.keys).length, 0)
			assert.equal(result.values.length, 0)
		})

	})


	describe(`default value`, () => {

		var PATH2 = PATH + '\\default-value-test'

		function createBeforeAndAfter() {
			before(async () => {
				await deleteKey(PATH2).catch(noop)
				await setKey(PATH2)
			})
			after(() => deleteKey(PATH2))
		}

		describe(`new key creation also creates default value with undefined data`, () => {
			createBeforeAndAfter()
			it('.getValue returns undefined', async () => {
				assert.equal(await getValue(PATH2, ''), undefined)
			})
			it('.hasValue does not throw', async () => {
				assert.isTrue(await hasValue(PATH2, ''))
			})
			it('.getValues includes it', async () => {
				assert.notEqual((await getValues(PATH2, false)).length, 0)
			})
		})

		describe(`no data`, () => {
			createBeforeAndAfter()
			it('.getValue returns undefined', async () => {
				await deleteValue(PATH2, '')
				assert.equal(await getValue(PATH2, ''), undefined)
			})
			it('.hasValue does not throw', async () => {
				assert.isTrue(await hasValue(PATH2, ''))
			})
			it('.getValues does not include it', async () => {
				assert.equal((await getValues(PATH2, {format: 'complex'})).length, 0)
			})
		})

		describe(`setting data to empty string`, () => {
			createBeforeAndAfter()
			it('.getValue returns empty string', async () => {
				await setValue(PATH2, '', '')
				assert.equal(await getValue(PATH2, ''), '')
			})
			it('.hasValue does not throw', async () => {
				assert.isTrue(await hasValue(PATH2, ''))
			})
			it('.getValues includes it', async () => {
				assert.notEqual((await getValues(PATH2, {format: 'complex'})).length, 0)
			})
		})

		describe(`setting data to string`, () => {
			createBeforeAndAfter()
			it('.getValue returns the string', async () => {
				await setValue(PATH2, '', 'harmony')
				assert.equal(await getValue(PATH2, ''), 'harmony')
			})
			it('.hasValue does not throw', async () => {
				assert.isTrue(await hasValue(PATH2, ''))
			})
			it('.getValues includes it', async () => {
				assert.notEqual((await getValues(PATH2, {format: 'complex'})).length, 0)
			})
		})

	})


	describe('global options', () => {

		after(() => {
			Registry.format = 'simple'
			delete Registry.bits
		})

		it(`Registry.format = 'complex' is used for all calls`, async () => {
			assert.isObject(await getValues('HKCR\\*'))
			assert.isArray(await getValues('HKCR\\*', {format: 'complex'}))
			Registry.format = 'complex'
			assert.isArray(await getValues('HKCR\\*'))
			Registry.format = 'simple'
		})

		it(`Registry.format can by bypassed by specifying custom options`, async () => {
			Registry.format = 'complex'
			assert.isArray(await getValues('HKCR\\*'))
			assert.isObject(await getValues('HKCR\\*', {format: 'simple'}))
		})

		// it(`Registry.bits is used for all calls`, async () => {
		// 	assert.isOk(isNode64bit, isNode64bitMsg)

		// 	var NAME = 'global-bits'

		// 	await Registry.delete(PATH)
		// 	await Registry.delete(PATH_32BIT)

		// 	Registry.bits = 32
		// 	await Registry.set(PATH, NAME, '32b')
		// 	Registry.bits = 64
		// 	await Registry.set(PATH, NAME, '64b')
		// 	Registry.bits = undefined

		// 	assert.equal(await getValue(PATH, NAME), '64b')
		// 	assert.equal(await getValue(PATH_32BIT, NAME), '32b')
		// })

		// it(`Registry.bits can by bypassed by specifying custom options`, async () => {
		// 	assert.isOk(isNode64bit, isNode64bitMsg)

		// 	var NAME = 'bypassing-global-bits'

		// 	await Registry.delete(PATH)
		// 	await Registry.delete(PATH_32BIT)

		// 	Registry.bits = 32
		// 	await Registry.set(PATH, NAME, '', {bits: 64})
		// 	Registry.bits = undefined

		// 	assert.isTrue(await hasValue(PATH, NAME))
		// 	assert.isFalse(await hasValue(PATH_32BIT, NAME))
		// })

	})

})



describe('new Registry', () => {

	var reg = new Registry(OW_PATH)
	after(cleanUpRegistry)


	describe('._formatArgs', () => {

		it('handles subpath-less args', async () => {
			var result = reg._formatArgs(['name'])
			assert.equal(result.path, OW_PATH)
			assert.equal(result.name, 'name')
		})

		it('handles args with subpath', async () => {
			var result = reg._formatArgs(['\\Blackwatch', 'name'])
			assert.equal(result.path, BW_PATH)
		})

		it('handles args with relative subpath', async () => {
			var result = reg._formatArgs(['.\\Blackwatch', 'name'])
			assert.equal(result.path, BW_PATH)
		})

		it('handles subpath with forward slashes', async () => {
			var result = reg._formatArgs(['./Blackwatch', 'name'])
			assert.equal(result.path, BW_PATH)
		})

	})


	describe('.get', () => {

		it(`.get(name) returns the value if it exists`, async () => {
			await Registry.set(OW_PATH, 'leader', 'Jack Morrison')
			assert.isString(await reg.get('leader'))
		})

		it(`.get(name) returns undefined if the value doesn't exist`, async () => {
			assert.equal(await reg.get('foobar'), undefined)
		})

		it(`.get(subpath) returns the subkey if it exists`, async () => {
			await Registry.set(BW_PATH)
			assert.isObject(await reg.get('\\Blackwatch'))
		})

		it(`.get(subpath) returns undefined if the subkey doesn't exist`, async () => {
			assert.equal(await reg.get('\\whitewatch'), undefined)
		})

		it(`.get(subpath, name) returns the value if it and the subkey exists`, async () => {
			await Registry.set(BW_PATH, 'leader', 'Gabriel Reyes')
			assert.isString(await reg.get('\\Blackwatch', 'leader'))
		})

		it(`.get(subpath, name) returns undefined or the subkey of the value doesn't exist`, async () => {
			assert.equal(await reg.get('\\Blackwatch', 'foobar'), undefined)
			assert.equal(await reg.get('\\whitewatch', 'leader'), undefined)
		})

	})

	describe('.has', () => {

		it(`.has(name) returns true if the value exists`, async () => {
			await Registry.set(OW_PATH, 'leader', 'Jack Morrison')
			assert.isTrue(await reg.has('leader'))
		})

		it(`.has(name) returns false if the value doesn't exist`, async () => {
			assert.isFalse(await reg.has('foobar'))
		})

		it(`.has(subpath) returns true if the subkey exists`, async () => {
			await Registry.set(BW_PATH)
			assert.isTrue(await reg.has('\\Blackwatch'))
		})

		it(`.has(subpath) returns false if the subkey doesn't exist`, async () => {
			assert.isFalse(await reg.has('\\whitewatch'))
		})

		it(`.has(subpath, name) returns true if the subkey and the value exists`, async () => {
			await Registry.set(BW_PATH, 'leader', 'Gabriel Reyes')
			assert.isTrue(await reg.has('\\Blackwatch', 'leader'))
		})

		it(`.has(subpath, name) returns false if the subkey or the value doesn't exist`, async () => {
			assert.isFalse(await reg.has('\\Blackwatch', 'foobar'))
			assert.isFalse(await reg.has('\\whitewatch', 'leader'))
		})

	})

	describe('.set', () => {

		it(`.set(name) creates the value exists if it doesn't exist`, async () => {
			var NAME = 'leader'
			var DATA = 'Jack Morrison'
			await Registry.delete(OW_PATH, NAME)
			await Registry.set(OW_PATH, NAME, DATA)
			assert.isTrue(await Registry.has(OW_PATH, NAME))
			assert.equal(await Registry.get(OW_PATH, NAME), DATA)
		})

		it(`.set(name) rewrites the value if it exists`, async () => {
			var NAME = 'leader'
			var DATA = 'Jack Morrison'
			await Registry.set(OW_PATH, NAME, 'previous data')
			await Registry.set(OW_PATH, NAME, DATA)
			assert.equal(await Registry.get(OW_PATH, NAME), DATA)
		})

		it(`.set(subpath) creates subkey`, async () => {
			await Registry.delete(BW_PATH)
			await reg.set('\\Blackwatch')
			assert.isTrue(await Registry.has(BW_PATH))
		})

		it(`.set(subpath) does nothing if the subkey already exists`, async () => {
			await Registry.delete(BW_PATH)
			await reg.set('\\Blackwatch')
			await reg.set('\\Blackwatch')
			assert.isTrue(await Registry.has(BW_PATH))
		})

		it(`.set(subpath, name) creates subkey with an empty named value`, async () => {
			await Registry.delete(BW_PATH)
			await reg.set('\\Blackwatch', 'Disbanded')
			assert.isTrue(await Registry.has(BW_PATH, 'Disbanded'))
			assert.equal(await Registry.get(BW_PATH, 'Disbanded'), '')
		})

		it(`.set(subpath, '', data) creates subkey with a default value`, async () => {
			var DATA = 'Scretive branch of overwatch'
			await Registry.delete(BW_PATH)
			await reg.set('\\Blackwatch', '', DATA)
			assert.isTrue(await Registry.has(BW_PATH))
			assert.equal(await Registry.get(BW_PATH, ''), DATA)
		})

		it(`.set(subpath, name, data) creates subkey and a named value`, async () => {
			var NAME = 'leader'
			var DATA = 'Gabriel Reyes'
			await Registry.delete(BW_PATH)
			await reg.set('\\Blackwatch', NAME, DATA)
			assert.isTrue(await Registry.has(BW_PATH))
			assert.equal(await Registry.get(BW_PATH, NAME), DATA)
		})

	})


	describe('.delete', () => {

		it(`.delete(name) deletes the value if it exists`, async () => {
			await Registry.set(OW_PATH, 'leader', 'Jack Morrison')
			await reg.delete('leader')
			assert.isFalse(await Registry.has(OW_PATH, 'leader'))
		})

		it(`.delete(name) does nothing if the value doesn't exist`, async () => {
			await reg.delete('foobar')
			assert.isFalse(await Registry.has(OW_PATH, 'foobar'))
		})

		it(`.delete(subpath, name) deletes the value if it and the subkey exists`, async () => {
			await Registry.set(BW_PATH, 'leader', 'Gabriel Reyes')
			await reg.delete('\\Blackwatch', 'leader')
			assert.isFalse(await Registry.has(BW_PATH, 'leader'))
			assert.isTrue(await Registry.has(BW_PATH))
		})

		it(`.delete(subpath, name) does nothing or the subkey of the value doesn't exist`, async () => {
			assert.notExists(await reg.delete('\\Blackwatch', 'foobar'))
			assert.notExists(await reg.delete('\\whitewatch', 'leader'))
		})

		it(`.delete(subpath) deletes the subkey if it exists`, async () => {
			await Registry.set(BW_PATH)
			await reg.delete('\\Blackwatch')
			assert.isFalse(await Registry.has(BW_PATH))
		})

		it(`.delete(subpath) does nothing if the subkey doesn't exist`, async () => {
			reg.delete('\\whitewatch')
			assert.isFalse(await Registry.has(OW_PATH + '\\whitewatch'))
		})

		it(`.delete() deletes the key if it exists`, async () => {
			await Registry.set(OW_PATH)
			await reg.delete()
			assert.isFalse(await Registry.has(OW_PATH))
		})

		it(`.delete() does nothing if the key doesn't exist`, async () => {
			await Registry.set(OW_PATH)
			await reg.delete()
			assert.notExists(await reg.delete())
		})

	})

	// TODO: tests for such options as 'lowercase' and 'format'

	describe('{mode}', () => {
	
		it('works with 32 and 64 bit registry views', async () => {
			await Registry.delete(PATH)
			await Registry.delete(PATH_32BIT)
	
			var reg64 = new Registry(PATH, {bits: 64})
			var reg32 = new Registry(PATH, {bits: 32})
	
			await reg64.set('reg-mode', 'reg64bit')
			await reg32.set('reg-mode', 'reg32bit')
	
			assert.equal(await reg64.get('reg-mode'), 'reg64bit')
			assert.equal(await reg32.get('reg-mode'), 'reg32bit')
			assert.equal(await getValue(PATH_32BIT, 'reg-mode', {bits: 64}), 'reg32bit')
		})
	
	})

})
