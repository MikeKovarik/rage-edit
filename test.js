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


var OW_PATH = 'HKLM\\SOFTWARE\\Overwatch'
var BW_PATH = 'HKLM\\SOFTWARE\\Overwatch\\Blackwatch'

const PATH = 'HKLM\\SOFTWARE\\MikeKovarik'
const PATH_NONEXISTENT = 'HKCR\\Some\\made\\up\\path\\that\\doesnt\\exist'
const PATH_BLOCK = 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Shell Extensions\\Blocked'

function noop() {}
var resolveError = err => err


describe('Registry static', () => {


	describe('.getKeys', () => {

		it('is function', async () => {
			assert.isFunction(Registry.getKeys)
		})

		it('returns undefined if the key path does not exist', async () => {
			var keys = await Registry.getKeys(PATH_NONEXISTENT)
			assert.equal(keys, undefined)
		})

		it('returns an array', async () => {
			var keys = await Registry.getKeys('HKCR\\Directory\\Background')
			assert.isArray(keys)
		})

		it('accepts full hive names', async () => {
			var keys = await Registry.getKeys('HKEY_CLASSES_ROOT\\Directory\\Background')
			assert.isArray(keys)
		})

		it('returns empty array if no subkeys', async () => {
			// note: .txt pobably always has ShellNew subkey. It's best bet for writing test without
			// having to employ other methods like setKey()
			var keys = await Registry.getKeys('HKCR\\.txt\\ShellNew')
			assert.isEmpty(keys)
		})

		it('returned array should contain subkeys', async () => {
			var keys = await Registry.getKeys('HKCR\\Directory\\Background')
			for (var item of keys) {
				assert.isFalse(item.toUpperCase().startsWith('HKEY_CLASSES_ROOT'))
			}
			assert.include(keys, 'shell')
			assert.include(keys, 'shellex')
		})

		it('returns an array of lowercase subkeys by default', async () => {
			var keys = await Registry.getKeys('HKCR\\Directory\\Background\\shellex')
			assert.isNotEmpty(keys)
			assert.include(keys, 'contextmenuhandlers')
		})

		it('returns an array of case sensitive subkeys if requested', async () => {
			var keys = await Registry.getKeys('HKCR\\Directory\\Background\\shellex', {lowercase: false})
			assert.isNotEmpty(keys)
			assert.include(keys, 'ContextMenuHandlers')
		})

		describe('complex form', () => {

			it('returns an array of strings', async () => {
				var keys = await Registry.getKeys('HKCR\\Directory\\Background', {format: 'complex'})
				assert.isArray(keys)
				assert.isNotEmpty(keys)
				var item = keys[0]
				assert.isString(item)
			})

			it('subkeys start with long hive names', async () => {
				var keys = await Registry.getKeys('HKCR\\Directory\\Background', {format: 'complex'})
				for (var item of keys) {
					assert.isTrue(item.toUpperCase().startsWith('HKEY_CLASSES_ROOT'))
				}
			})

			it('includes correct subkeys', async () => {
				var keys = await Registry.getKeys('HKCR\\Directory\\Background', {format: 'complex'})
				keys = keys.map(key => key.split('\\').pop())
				assert.include(keys, 'shell')
				assert.include(keys, 'shellex')
			})

			it('includes correct subkeys 2', async () => {
				var keys = await Registry.getKeys('HKCR\\Directory\\Background\\shellex', {format: 'complex'})
				keys = keys.map(path => path.toLowerCase())
				assert.include(keys, 'hkey_classes_root\\directory\\background\\shellex\\contextmenuhandlers')
			})

		})

	})



	describe('.getValues', () => {

		it('is function', async () => {
			assert.isFunction(Registry.getValues)
		})

		it('returns undefined if the key path does not exist', async () => {
			var values = await Registry.getValues(PATH_NONEXISTENT)
			assert.equal(values, undefined)
		})

		it('returns an object', async () => {
			var values = await Registry.getValues('HKCR\\*')
			assert.isObject(values)
		})

		it('returns empty object if no entries', async () => {
			var values = await Registry.getValues('HKCR\\*\\shell')
			assert.isEmpty(values)
		})

		it('undefined values should be properly recognized as undefined', async () => {
			var values = await Registry.getValues('HKCR\\*')
			assert.equal(values[''], undefined)
		})

		it('empty string values should be properly recognized as empty string', async () => {
			var values = await Registry.getValues('HKCR\\*')
			assert.equal(values['alwaysshowext'], '')
		})


		// NOTE: paths and value names are key insensitive and whenever its queries
		// reg command will always respond. But when 
		it('value name is case insensitive by default', async () => {
			var result = await Registry.getValues('HKCR\\*')
			assert.exists(result['alwaysshowext'])
			result = await Registry.getValues('HKCR\\*')
			assert.notExists(result['AlwaysShowExt'])
		})

		it('can be switched to case sensitive', async () => {
			var result = await Registry.getValues('HKCR\\*', {lowercase: false})
			assert.exists(result['AlwaysShowExt'])
			result = await Registry.getValues('HKCR\\*', {lowercase: false})
			assert.notExists(result['alwaysshowext'])
		})



		describe('complex form', () => {

			it('returns an array of objects', async () => {
				var values = await Registry.getValues('HKCR\\*', {format: 'complex'})
				assert.isArray(values)
				var entry = values[0]
				assert.isObject(entry)
			})

			it('entries are represented by objects', async () => {
				var values = await Registry.getValues('HKCR\\*', {format: 'complex'})
				var entry = values[0]
				assert.isString(entry.name)
				assert.isTrue('data' in entry)
				assert.isString(entry.type)
			})

		})

	})


	describe('.getValue', () => {

		it('is function', async () => {
			assert.isFunction(Registry.getValue)
		})

		it('returns undefined if the key path does not exist', async () => {
			var result = await Registry.getValue(PATH_NONEXISTENT)
			assert.equal(result, undefined)
		})

		it('returns value of default entry', async () => {
			var result = await Registry.getValue('HKCR\\Directory', '')
			assert.equal(result, 'File Folder')
		})

		it('omitted second argument (name) falls back to default name (empty string)', async () => {
			var result = await Registry.getValue('HKCR\\Directory')
			assert.equal(result, 'File Folder')
		})

		it('returns empty string if the value entry has empty string data', async () => {
			var result = await Registry.getValue('HKCR\\*', 'alwaysshowext')
			assert.equal(result, '')
		})

		it('returns string if the value entry has string data', async () => {
			var result = await Registry.getValue('HKCR\\*', 'AlwaysShowExt')
			assert.isString(result)
		})

		// NOTE: reg command is insensitive 
		it('value name is case insensitive by default', async () => {
			var result = await Registry.getValue('HKCR\\*', 'AlwaysShowExt')
			assert.exists(result)
			result = await Registry.getValue('HKCR\\*', 'alwaysshowext')
			assert.exists(result)
		})

		//it('can be switched to case sensitive', async () => {
		//	var result = await Registry.getValue('HKCR\\*', 'AlwaysShowExt', true)
		//	assert.exists(result)
		//	result = await Registry.getValue('HKCR\\*', 'alwaysshowext', true)
		//	assert.notExists(result)
		//})

		it('returns undefined if the value entry exists, but does not value any data', async () => {
			var result = await Registry.getValue('HKCR\\*', '')
			assert.equal(result, undefined)
		})


		describe('output type casting', () => {

			const PATH = 'HKLM\\SOFTWARE\\MikeKovarik'

			it('reads REG_SZ as string', async () => {
				var NAME = 'casting-1'
				await Registry.setValue(PATH, NAME, 'some string', 'REG_SZ')
				assert.isString(await Registry.getValue(PATH, NAME))
			})

			it('reads REG_DWORD as number', async () => {
				var NAME = 'casting-2'
				await Registry.setValue(PATH, NAME, 1234, 'REG_DWORD')
				assert.isNumber(await Registry.getValue(PATH, NAME))
			})

			it('reads REG_QWORD as string in 0x format', async () => {
				var NAME = 'casting-3'
				await Registry.setValue(PATH, NAME, 1234, 'REG_QWORD')
				var data = await Registry.getValue(PATH, NAME)
				assert.isString(data)
				assert.isTrue(data.startsWith('0x'))
			})

			it('reads REG_BINARY as buffer', async () => {
				var NAME = 'casting-4'
				await Registry.setValue(PATH, NAME, Buffer.alloc(0), 'REG_BINARY')
				var data = await Registry.getValue(PATH, NAME)
				assert.equal(data.constructor.name, 'Buffer')
			})

			it('reads REG_MULTI_SZ as array', async () => {
				var NAME = 'casting-4'
				await Registry.setValue(PATH, NAME, [], 'REG_MULTI_SZ')
				assert.isArray(await Registry.getValue(PATH, NAME))
			})

			it('string to REG_BINARY', async () => {
				var NAME = 'binary-value'
				var buffer = Buffer.from('Experience tranquility')
				await Registry.deleteValue(PATH, NAME)
				await Registry.setValue(PATH, NAME, buffer.toString(), 'REG_BINARY')
				var {data, type} = await Registry.getValue(PATH, NAME, {format: 'complex'})
				assert.equal(type, 'REG_BINARY')
				assert.equal(data.toString(), buffer.toString())
			})

		})

		describe('complex form', () => {

			it('returns an object', async () => {
				var entry = await Registry.getValue('HKCR\\*', 'AlwaysShowExt', {format: 'complex'})
				assert.isObject(entry)
			})

			it(`has 'name', 'type' and 'data' fields`, async () => {
				var entry = await Registry.getValue('HKCR\\*', 'AlwaysShowExt', {format: 'complex'})
				assert.isString(entry.name)
				assert.isTrue('data' in entry)
				assert.isString(entry.type)
			})

		})

	})




	describe('.getKey', () => {

		it('is function', async () => {
			assert.equal(typeof Registry.getKey, 'function')
		})

		it('returns undefined if the key path does not exist', async () => {
			var result = await Registry.getKey(PATH_NONEXISTENT)
			assert.equal(typeof result, 'undefined')
		})

		it('returns lowercase keys', async () => {
			var result = await Registry.getKey('HKCR\\Directory\\shellex', {lowercase: true})
			assert.isObject(result['contextmenuhandlers'])
			assert.notExists(result['ContextMenuHandlers'])
		})

		it('can return case sensitive keys', async () => {
			var result = await Registry.getKey('HKCR\\Directory\\shellex', {lowercase: false})
			assert.isObject(result['ContextMenuHandlers'])
			assert.notExists(result['contextmenuhandlers'])
		})

		describe('simple format', () => {

			it('returns simple format', async () => {
				var result = await Registry.getKey('HKCR\\Directory')
				assert.isObject(result)
				assert.isObject(result.$values)
			})

			it('has keys', async () => {
				var result = await Registry.getKey('HKCR\\Directory')
				assert.exists(result['background'])
				assert.exists(result['shell'])
				assert.exists(result['shellex'])
			})

			it('has values', async () => {
				var result = await Registry.getKey('HKCR\\Directory')
				assert.equal(result.$values[''], 'File Folder')
			})

			it('empty default value does show up in $values', async () => {
				await Registry.delete(OW_PATH)
				await Registry.set(OW_PATH)
				var result = await Registry.getKey(OW_PATH)
				assert.isNotEmpty(Object.keys(result.$values))
				assert.isTrue(Object.keys(result.$values).includes(''))
			})
			it('undefined default value does not show up in $values', async () => {
				await Registry.delete(OW_PATH)
				await Registry.set(OW_PATH)
				await Registry.delete(OW_PATH, '')
				var result = await Registry.getKey(OW_PATH)
				assert.isEmpty(Object.keys(result.$values))
			})

			it('can work recursively', async () => {
				var result = await Registry.getKey('HKCR\\Directory\\Background', true)
				assert.isObject(result['shellex'])
				assert.isObject(result['shellex']['contextmenuhandlers'])
			})

		})

		describe('complex format', () => {

			it('returns complex format', async () => {
				var result = await Registry.getKey('HKCR\\Directory', {format: 'complex'})
				assert.isObject(result)
				assert.isObject(result.keys) // TODO
				assert.isArray(result.values)
			})

			it('has keys', async () => {
				var result = await Registry.getKey('HKCR\\Directory', {format: 'complex'})
				assert.exists(result.keys['background'])
				assert.exists(result.keys['shell'])
				assert.exists(result.keys['shellex'])
			})

			it('has values', async () => {
				var result = await Registry.getKey('HKCR\\Directory', {format: 'complex'})
				var defaultEntry = result.values.filter(entryObject => entryObject.name === '')[0]
				assert.isObject(defaultEntry)
				assert.equal(defaultEntry.name, '')
				assert.equal(defaultEntry.data, 'File Folder')
				assert.equal(defaultEntry.type, 'REG_SZ')
			})

			it('empty default value does show up in $values', async () => {
				await Registry.delete(OW_PATH)
				await Registry.set(OW_PATH)
				var result = await Registry.getKey(OW_PATH, {format: 'complex'})
				assert.isNotEmpty(result.values)
				assert.isTrue(result.values[0].name === '')
			})
			it('undefined default value does not show up in $values', async () => {
				await Registry.delete(OW_PATH)
				await Registry.set(OW_PATH)
				await Registry.delete(OW_PATH, '')
				var result = await Registry.getKey(OW_PATH, {format: 'complex'})
				assert.isEmpty(result.values)
			})

			it('can work recursively', async () => {
				var result = await Registry.getKey('HKCR\\Directory\\Background', true, {format: 'complex'})
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

	})


	describe('.hasKey', () => {

		it('is function', async () => {
			assert.isFunction(Registry.hasKey)
		})

		it('returns true if key at given path exists', async () => {
			assert.isTrue(await Registry.hasKey('HKLM\\SOFTWARE'))
		})

		it(`returns false if key at given path doesn't exist`, async () => {
			assert.isFalse(await Registry.hasKey('HKLM\\SOFTWARE\\MikeKovarik\\non\\existent'))
		})

	})


	describe('.hasValue', () => {

		it('is function', async () => {
			assert.isFunction(Registry.hasValue)
		})

		it('returns true if value entry exists at given path', async () => {
			assert.isTrue(await Registry.hasValue('HKCR\\*', 'AlwaysShowExt'))
		})

		it(`returns false if value entry doesn't exist at given path`, async () => {
			assert.isFalse(await Registry.hasValue('HKCR\\*', 'foo-bar non existent'))
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
			assert.isFalse(await Registry.has('HKLM\\SOFTWARE\\MikeKovarik\\non\\existent'))
		})

		it('returns true if value entry exists at given path', async () => {
			assert.isTrue(await Registry.has('HKCR\\*', 'AlwaysShowExt'))
		})

		it(`returns false if value entry doesn't exist at given path`, async () => {
			assert.isFalse(await Registry.has('HKCR\\*', 'foo-bar non existent'))
		})

	})


	describe('.deleteKey', () => {

		it('is function', async () => {
			assert.isFunction(Registry.deleteKey)
		})

		it('deletes the key at given path', async () => {
			await Registry.setKey(PATH)
			await Registry.deleteKey(PATH)
			assert.isFalse(await Registry.hasKey(PATH))
		})

		it('deletion of an existing key does not throw', async () => {
			await Registry.setKey(PATH)
			await assert.willNotThrow(Registry.deleteKey(PATH))
		})

		it('deletion of nonexisting key does not throw', async () => {
			await Registry.deleteKey('HKLM\\SOFTWARE\\MikeKovarik\\some\\random\\key')
		})

	})


	describe('.deleteValue', () => {

		it('is function', async () => {
			assert.isFunction(Registry.deleteValue)
		})

		it('deletes the value at given path', async () => {
			const NAME = 'deleteme'
			await Registry.set(PATH, NAME, 'this is the value entry to be deleted')
			assert.isTrue(await Registry.hasValue(PATH, NAME))
			await Registry.deleteValue(PATH, NAME)
			assert.isFalse(await Registry.hasValue(PATH, NAME))
		})

		it('deletion of an existing value entry does not throw', async () => {
			const NAME = 'deleteme'
			await Registry.set(PATH, NAME, 'this is the value entry to be deleted')
			await assert.willNotThrow(Registry.deleteValue(PATH, NAME))
		})

		//it('deletion of nonexisting value entry throws', async () => {
		it('deletion of nonexisting value does not throw', async () => {
			const NAME = 'deleteme'
			await Registry.deleteValue(PATH, NAME).catch(noop)
			await Registry.deleteValue(PATH, NAME)
		})

	})


	describe('.delete', () => {

		it('is function', async () => {
			assert.isFunction(Registry.delete)
		})

		it('only using one parameter serves as alias for .deleteKey', async () => {
			await Registry.setKey(PATH)
			assert.isTrue(await Registry.hasKey(PATH))
			await Registry.delete(PATH)
			assert.isFalse(await Registry.hasKey(PATH))
		})

		it('using two parameters serves as alias for .deleteValue', async () => {
			var NAME = 'deleteme'
			await Registry.set(PATH, NAME, 'Embrace the Iris')
			assert.isTrue(await Registry.hasKey(PATH))
			assert.isTrue(await Registry.hasValue(PATH, NAME))
			await Registry.delete(PATH, NAME)
			assert.isTrue(await Registry.hasKey(PATH))
			assert.isFalse(await Registry.hasValue(PATH, NAME))
		})

	})



	describe('.setKey', () => {

		it('is function', async () => {
			assert.isFunction(Registry.setKey)
		})

		it('creates new key', async () => {
			const PATH = 'HKLM\\SOFTWARE\\MikeKovarik\\nonexistent'
			await Registry.deleteKey(PATH).catch(noop)
			await Registry.setKey(PATH)
			assert.isTrue(await Registry.hasKey(PATH))
		})

		it('overwrites already existing key', async () => {
			const PATH = 'HKLM\\SOFTWARE\\MikeKovarik\\existing'
			await Registry.setKey(PATH).catch(noop)
			await Registry.setKey(PATH)
			assert.isTrue(await Registry.hasKey(PATH))
		})

	})


	describe('.setValue', () => {

		async function getEntryType(NAME) {
			// get complex object
			var result = await Registry.getValue(PATH, NAME, {format: 'complex'})
			return result.type
		}

		it('is function', async () => {
			assert.isFunction(Registry.setValue)
		})

		it('creates new value entry', async () => {
			var NAME = 'value-entry-1'
			var DATA = 'this is the newly created value data'
			await Registry.deleteValue(PATH, NAME).catch(noop)
			assert.isFalse(await Registry.hasValue(PATH, NAME))
			await Registry.setValue(PATH, NAME, DATA)
			assert.equal(await Registry.getValue(PATH, NAME), DATA)
		})

		it('overwrites existing value entry', async () => {
			var NAME = 'value-entry-2'
			var INITIAL_DATA = 'initial data'
			var FINAL_DATA = 'expected final data'
			await Registry.setValue(PATH, NAME, INITIAL_DATA)
			assert.isTrue(await Registry.hasValue(PATH, NAME))
			await Registry.setValue(PATH, NAME, FINAL_DATA)
			assert.equal(await Registry.getValue(PATH, NAME), FINAL_DATA)
		})

		it(`creates empty REG_SZ value if the data argument isn't specified`, async () => {
			var NAME = 'LegacyDisable'
			await Registry.delete(OW_PATH, NAME)
			await Registry.setValue(OW_PATH, NAME)
			var value = await Registry.getValue(OW_PATH, NAME, {format: 'complex'})
			assert.equal(value.name, 'legacydisable')
			assert.equal(value.type, 'REG_SZ')
			assert.equal(value.data, '')
		})

		it('also creates key if the path doesnt exist', async () => {
			var NAME = 'nested-entry-1'
			var DATA = 'this is the newly created value data'
			await Registry.deleteKey(PATH + '\\deep', NAME).catch(noop)
			assert.isFalse(await Registry.hasKey(PATH + '\\deep'))
			await Registry.setValue(PATH + '\\deep\\sub\\key', NAME, DATA)
			assert.isTrue(await Registry.hasKey(PATH + '\\deep'))
		})


		describe('input data type inferring', () => {

			it('string as REG_SZ', async () => {
				var NAME = 'type-infer-1'
				await Registry.setValue(PATH, NAME, 'some string')
				assert.equal(await getEntryType(NAME), 'REG_SZ')
			})

			it('number as REG_DWORD', async () => {
				var NAME = 'type-infer-2'
				await Registry.setValue(PATH, NAME, 123)
				assert.equal(await getEntryType(NAME), 'REG_DWORD')
			})

			it('array as REG_MULTI_SZ', async () => {
				var NAME = 'type-infer-3'
				await Registry.setValue(PATH, NAME, ['one', 'two', 'three'])
				assert.equal(await getEntryType(NAME), 'REG_MULTI_SZ')
			})

			it('buffer as REG_BINARY', async () => {
				var NAME = 'type-infer-4'
				await Registry.setValue(PATH, NAME, Buffer.from('Zenyatta'))
				assert.equal(await getEntryType(NAME), 'REG_BINARY')
			})

		})


		describe('storing and retrieving the same value', () => {

			it('REG_SZ string', async () => {
				var NAME = 'value-1'
				var DATA = 'some data'
				await Registry.setValue(PATH, NAME, DATA, 'REG_SZ')
				assert.equal(await Registry.getValue(PATH, NAME), DATA)
			})

			it('REG_DWORD number', async () => {
				var NAME = 'value-2'
				var DATA = 123
				await Registry.setValue(PATH, NAME, DATA, 'REG_DWORD')
				assert.equal(await Registry.getValue(PATH, NAME), DATA)
			})

			it('REG_DWORD string', async () => {
				var NAME = 'value-3'
				var DATA = '123'
				await Registry.setValue(PATH, NAME, DATA, 'REG_DWORD')
				assert.equal(await Registry.getValue(PATH, NAME), DATA)
			})

			it('REG_QWORD number', async () => {
				var NAME = 'value-4'
				var DATA = 123
				await Registry.setValue(PATH, NAME, DATA, 'REG_QWORD')
				assert.equal(await Registry.getValue(PATH, NAME), '0x' + DATA.toString(16))
			})

			it('REG_QWORD number', async () => {
				var NAME = 'value-5'
				var DATA = 123
				await Registry.setValue(PATH, NAME, DATA + '', 'REG_QWORD')
				assert.equal(await Registry.getValue(PATH, NAME), '0x' + DATA.toString(16))
			})

			it('REG_MULTI_SZ array', async () => {
				var NAME = 'value-6'
				var DATA = ['one', 'two', 'three']
				await Registry.setValue(PATH, NAME, DATA, 'REG_MULTI_SZ')
				var array = await Registry.getValue(PATH, NAME)
				assert.equal(array.length, DATA.length)
				assert.equal(array[0], DATA[0])
				assert.equal(array[1], DATA[1])
				assert.equal(array[2], DATA[2])
			})

			it('REG_MULTI_SZ string', async () => {
				var NAME = 'value-7'
				var DATA = 'one\0two\0three'
				await Registry.setValue(PATH, NAME, DATA, 'REG_MULTI_SZ')
				var array = await Registry.getValue(PATH, NAME)
				assert.equal(array.length, 3)
				assert.equal(array[0], 'one')
				assert.equal(array[1], 'two')
				assert.equal(array[2], 'three')
			})

			it('REG_BINARY', async () => {
				var NAME = 'value-8'
				var DATA = Buffer.from('Experience tranquility')
				await Registry.setValue(PATH, NAME, DATA, 'REG_BINARY')
				var buffer = await Registry.getValue(PATH, NAME)
				assert.equal(buffer.toString(), DATA.toString())
			})

		})


		describe('iput data type override', () => {

			it('explicitly stores string as REG_DWORD', async () => {
				var NAME = 'type-override-1'
				await Registry.setValue(PATH, NAME, '123', 'REG_DWORD')
				assert.equal(await getEntryType(NAME), 'REG_DWORD')
			})

			it('explicitly stores string as REG_QWORD', async () => {
				var NAME = 'type-override-2'
				await Registry.setValue(PATH, NAME, '123', 'REG_QWORD')
				assert.equal(await getEntryType(NAME), 'REG_QWORD')
			})

			it('explicitly stores buffer as REG_SZ', async () => {
				var NAME = 'type-override-3'
				await Registry.setValue(PATH, NAME, Buffer.from('Zenyatta'), 'REG_SZ')
				assert.equal(await getEntryType(NAME), 'REG_SZ')
			})

			it('explicitly stores string as REG_BINARY', async () => {
				var NAME = 'type-override-4'
				var DATA = 'Experience tranquility'
				await Registry.setValue(PATH, NAME, 'Zenyatta', 'REG_BINARY')
				assert.equal(await getEntryType(NAME), 'REG_BINARY')
			})

		})


		describe('type name alias', () => {

			it('sz as REG_SZ', async () => {
				var NAME = 'value-entry-9'
				var DATA = '123'
				await Registry.setValue(PATH, NAME, DATA, 'sz')
				assert.equal(await getEntryType(NAME), 'REG_SZ')
			})

			it('dword as REG_DWORD', async () => {
				var NAME = 'value-entry-10'
				var DATA = 123
				await Registry.setValue(PATH, NAME, DATA, 'dword')
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


	})


	describe('.clearValues', () => {

		it('is function', async () => {
			assert.isFunction(Registry.clearValues)
		})

		it('deletes all values at given path, except for the default one', async () => {
			await Registry.set(PATH, '', 'Experience tranquility')
			await Registry.set(PATH, 'val1', 'Embrace the Iris')
			//assert.isTrue(await Registry.hasKey(PATH))
			//assert.isTrue(await Registry.hasValue(PATH, ''))
			//assert.isTrue(await Registry.hasValue(PATH, 'val1'))
			await Registry.clearValues(PATH)
			assert.isTrue(await Registry.hasKey(PATH))
			assert.isTrue(await Registry.hasValue(PATH, ''))
			assert.isFalse(await Registry.hasValue(PATH, 'val1'))
			assert.equal(Object.keys(await Registry.getValues(PATH)).length, 0)
		})

		it('retains subkeys', async () => {
			await Registry.setKey(PATH + '\\subkey')
			await Registry.clearValues(PATH)
			assert.notEqual((await Registry.getKeys(PATH)).length, 0)
		})

	})


	describe('.clearKeys', () => {

		it('is function', async () => {
			assert.isFunction(Registry.clearKeys)
		})

		it('deletes all subkeys', async () => {
			await Registry.set(PATH + '\\subpath', 'val1', 'Embrace the Iris')
			await Registry.clearKeys(PATH)
			assert.equal(Object.keys(await Registry.getKeys(PATH)).length, 0)
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
				await Registry.deleteKey(PATH2).catch(noop)
				await Registry.setKey(PATH2)
			})
			after(() => Registry.deleteKey(PATH2))
		}

		describe(`new key creation also creates default value with empty string data`, () => {
			createBeforeAndAfter()
			it('.getValue returns undefined', async () => {
				assert.equal(await Registry.getValue(PATH2, ''), '')
			})
			it('.hasValue does not throw', async () => {
				assert.isTrue(await Registry.hasValue(PATH2, ''))
			})
			it('.getValues includes it', async () => {
				assert.notEqual((await Registry.getValues(PATH2, false)).length, 0)
			})
		})

		describe(`no data`, () => {
			createBeforeAndAfter()
			it('.getValue returns undefined', async () => {
				await Registry.deleteValue(PATH2, '')
				assert.equal(await Registry.getValue(PATH2, ''), undefined)
			})
			it('.hasValue does not throw', async () => {
				assert.isTrue(await Registry.hasValue(PATH2, ''))
			})
			it('.getValues does not include it', async () => {
				assert.equal((await Registry.getValues(PATH2, {format: 'complex'})).length, 0)
			})
		})

		describe(`setting data to empty string`, () => {
			createBeforeAndAfter()
			it('.getValue returns empty string', async () => {
				await Registry.setValue(PATH2, '', '')
				assert.equal(await Registry.getValue(PATH2, ''), '')
			})
			it('.hasValue does not throw', async () => {
				assert.isTrue(await Registry.hasValue(PATH2, ''))
			})
			it('.getValues includes it', async () => {
				assert.notEqual((await Registry.getValues(PATH2, {format: 'complex'})).length, 0)
			})
		})

		describe(`setting data to string`, () => {
			createBeforeAndAfter()
			it('.getValue returns the string', async () => {
				await Registry.setValue(PATH2, '', 'harmony')
				assert.equal(await Registry.getValue(PATH2, ''), 'harmony')
			})
			it('.hasValue does not throw', async () => {
				assert.isTrue(await Registry.hasValue(PATH2, ''))
			})
			it('.getValues includes it', async () => {
				assert.notEqual((await Registry.getValues(PATH2, {format: 'complex'})).length, 0)
			})
		})

	})


	describe('global options', () => {

		after(() => Registry.format = 'simple')

		it(`Registry.format = 'complex' is used for all calls`, async () => {
			assert.isObject(await Registry.getValues('HKCR\\*'))
			assert.isArray(await Registry.getValues('HKCR\\*', {format: 'complex'}))
			Registry.format = 'complex'
			assert.isArray(await Registry.getValues('HKCR\\*'))
			Registry.format = 'simple'
		})

		it(`Registry.format can by bypassed by specifying custom options`, async () => {
			Registry.format = 'complex'
			assert.isArray(await Registry.getValues('HKCR\\*'))
			assert.isObject(await Registry.getValues('HKCR\\*', {format: 'simple'}))
		})

	})


})



describe('new Registry', () => {

	var reg = new Registry(OW_PATH)


	describe('._formatArgs', () => {

		it('handles subpath-less args', async () => {
			var output = reg._formatArgs(['name'])
			assert.equal(output[0], OW_PATH)
			assert.equal(output[1], 'name')
		})

		it('handles args with subpath', async () => {
			var result = reg._formatArgs(['\\Blackwatch', 'name'])[0]
			assert.equal(result, BW_PATH)
		})

		it('handles args with relative subpath', async () => {
			var result = reg._formatArgs(['.\\Blackwatch', 'name'])[0]
			assert.equal(result, BW_PATH)
		})

		it('handles subpath with forward slashes', async () => {
			var result = reg._formatArgs(['./Blackwatch', 'name'])[0]
			assert.equal(result, BW_PATH)
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


})

