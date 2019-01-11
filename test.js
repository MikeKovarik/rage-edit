const {Registry, isAdmin} = require('./index.js')
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


// Promise wrapper for child_process.spawn().
var spawn = async (program, args) => {
	var cp = require('child_process')
	var stdio = ['ignore', 'pipe', 'pipe']
	var promiseOnce = (eventEmitter, event) => {
		return new Promise(resolve => eventEmitter.once(event, resolve))
	}
	var proc = cp.spawn(program, args, {stdio})
	
	var stdout = ''
	var stderr = ''
	proc.stdout.on('data', data => stdout += data.toString())
	proc.stderr.on('data', data => stderr += data.toString())
	
	var result = await Promise.race([
		promiseOnce(proc, 'close'),
		promiseOnce(proc, 'error'),
	])
	
	proc.removeAllListeners()
	
	if (result instanceof Error)
		throw result
	else
		return {stdout, stderr}
}


// Registry.debug = true

const isNode64bit    = (process.arch == 'x64')
const isNode64bitMsg = 'this test can be passed on 64-bit node.js only'

const PATH_ROOT        = 'HKLM\\SOFTWARE\\MikeKovarik\\rage-edit'
const PATH_ROOT_32BIT  = 'HKLM\\SOFTWARE\\Wow6432Node\\MikeKovarik\\rage-edit'
const PATH_NONEXISTENT = 'HKCR\\Some\\made\\up\\path\\that\\doesnt\\exist'

var noop        = () => {}
var generateUID = () => `${Date.now()}-${process.hrtime().join('')}`

// Wrappers
var getOpts     = Registry._argsToOpts
var getKey      = (...args) => Registry.getKey(getOpts(...args))
var getKeys     = (...args) => Registry.getKeys(getOpts(...args))
var getValue    = (...args) => Registry.getValue(getOpts(...args))
var getValues   = (...args) => Registry.getValues(getOpts(...args))
var hasKey      = (...args) => Registry.hasKey(getOpts(...args))
var hasValue    = (...args) => Registry.hasValue(getOpts(...args))
var deleteKey   = (...args) => Registry.deleteKey(getOpts(...args))
var deleteValue = (...args) => Registry.deleteValue(getOpts(...args))
var clearKeys   = (...args) => Registry.clearKeys(getOpts(...args))
var clearValues = (...args) => Registry.clearValues(getOpts(...args))
var setKey      = (...args) => Registry.setKey(getOpts(...args))
var setValue    = (...args) => Registry.setValue(getOpts(...args))

describe('[service] Prepare registry for tests', () => {

	it('test run with admin privileges', async () => {
		assert.isTrue(await isAdmin(), 'TEST SUITE HAS TO RUN UNDER ADMIN PRIVILEGE!!!')
	})

	it('import .reg file', async () => {
		await spawn('reg.exe', ['import', `${__dirname}\\test.reg`])
	})
	
	it('.reg file is imported properly', async () => {
		const VALUE = 'rage-edit tests'
		var {stdout} = await spawn('reg.exe', ['query', PATH_ROOT, '/ve'])
		assert.include(stdout, VALUE, `Default value of "${PATH_ROOT}" doesn't equal "${VALUE}"`)
	})
	
})


describe('Registry static', () => {

	describe('Internal', () => {

		describe('.getOptions', () => {

			it('returns valid values if called without arguments', async () => {
				var options = getOpts()
				assert.isUndefined(options.path)
				assert.isUndefined(options.name)
				assert.isUndefined(options.data)
				assert.isUndefined(options.type)
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
				assert.isUndefined(bitsNull)
			})

			it('converts arguments in proper order', async () => {
				const NAME = 'name'
				var DATA = 'value'
				var TYPE = 'REG_SZ'
				var FORMAT = Registry.format
				var options = getOpts(PATH_ROOT, NAME, DATA, {type: TYPE, format: FORMAT})
				assert.equal(options.path, PATH_ROOT)
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
				assert.isUndefined(Registry.lastCodePage)
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
				assert.isUndefined(Registry.lastCodePage)
			})

			it(`can't call .disableUnicode twice`, async () => {
				var enabled = await Registry.disableUnicode()
				assert.isFalse(enabled)
			})

		})

	})

	describe('.getKeys', () => {

		const PATH       = `${PATH_ROOT}\\.get() and .has()`
		const PATH_32BIT = `${PATH_ROOT_32BIT}\\.get() and .has()`


		it('is function', async () => {
			assert.isFunction(Registry.getKeys)
		})

		it('returns undefined if the key path does not exist', async () => {
			var keys = await getKeys({
				path: PATH_NONEXISTENT
			})
			assert.isUndefined(keys)
		})

		it('returns an array', async () => {
			var keys = await getKeys({
				path: PATH
			})
			assert.isArray(keys)
		})

		it('accepts full hive names', async () => {
			var keys = await getKeys({
				path: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\MikeKovarik'
			})
			assert.isArray(keys)
		})

		it('returns empty array if no subkeys', async () => {
			// note: .txt pobably always has ShellNew subkey. It's best bet for writing test without
			// having to employ other methods like setKey()
			var keys = await getKeys({
				path: `${PATH}\\Types`
			})
			assert.isEmpty(keys)
		})

		it('returned array should contain subkeys', async () => {
			var keys = await getKeys({
				path: PATH
			})
			for (var item of keys) {
				assert.isFalse(item.toUpperCase().startsWith('HKEY_LOCAL_MACHINE'))
			}
			assert.include(keys, 'emptysubkey')
			assert.include(keys, 'subkey64bit')
			assert.include(keys, 'subkeywithdefaultvalue')
			assert.include(keys, 'types')
		})

		it('returns an array of lowercase subkeys by default', async () => {
			var keys = await getKeys({
				path: PATH
			})
			assert.isNotEmpty(keys)
			assert.include(keys, 'subkeywithdefaultvalue')
		})

		it('returns an array of case sensitive subkeys if requested', async () => {
			var keys = await getKeys({
				path: PATH,
				lowercase: false
			})
			assert.isNotEmpty(keys)
			assert.include(keys, 'SubkeyWithDefaultValue')
		})

		it('returns different values in 64-bit and 32-bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			var keys64 = await getKeys({
				path: PATH,
				bits: 64
			})
			var keys32 = await getKeys({
				path: PATH,
				bits: 32
			})

			assert.isNotEmpty(keys64)
			assert.isNotEmpty(keys32)

			assert.notSameMembers(keys64, keys32)
		})

		it('returns same values for 32-bit mode and WOW6432Node key', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			const path = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
			const pathWow = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall'

			var keys32 = await getKeys({
				path: PATH,
				bits: 32
			})
			var keysWow = await getKeys({
				path: PATH_32BIT,
			})

			assert.isNotEmpty(keys32)
			assert.isNotEmpty(keysWow)

			assert.sameMembers(keys32, keysWow)
		})

		describe('complex form', () => {

			it('returns an array of strings', async () => {
				var keys = await getKeys({
					path: PATH,
					format: 'complex'
				})
				assert.isArray(keys)
				assert.isNotEmpty(keys)
				var item = keys[0]
				assert.isString(item)
			})

			it('subkeys start with long hive names', async () => {
				var keys = await getKeys({
					path: PATH,
					format: 'complex'
				})
				for (var item of keys) {
					assert.isTrue(item.toUpperCase().startsWith('HKEY_LOCAL_MACHINE'))
				}
			})

			it('includes correct subkeys', async () => {
				var keys = await getKeys({
					path: PATH,
					format: 'complex'
				})
				keys = keys.map(key => key.split('\\').pop())
				assert.include(keys, 'emptysubkey')
				assert.include(keys, 'subkey64bit')
				assert.include(keys, 'subkeywithdefaultvalue')
				assert.include(keys, 'types')
			})

			it('includes correct subkeys 2', async () => {
				var keys = await getKeys({
					path: PATH,
					format: 'complex'
				})
				keys = keys.map(path => path.toLowerCase())
				assert.include(keys, 'hkey_local_machine\\software\\mikekovarik\\rage-edit\\.get() and .has()\\types')
			})

		})

	})



	describe('.getValues', () => {

		const PATH       = `${PATH_ROOT}\\.get() and .has()`
		const PATH_32BIT = `${PATH_ROOT_32BIT}\\.get() and .has()`


		it('is function', async () => {
			assert.isFunction(Registry.getValues)
		})

		it('returns undefined if the key path does not exist', async () => {
			var values = await getValues({
				path: PATH_NONEXISTENT
			})
			assert.isUndefined(values)
		})

		it('returns an object', async () => {
			var values = await getValues({
				path: PATH
			})
			assert.isObject(values)
		})

		it('returns empty object if no entries', async () => {
			var values = await getValues({
				path: `${PATH}\\EmptySubkey`
			})
			assert.isEmpty(values)
		})

		it('undefined values should be properly recognized as undefined', async () => {
			var values = await getValues({
				path: `${PATH}\\EmptySubkey`
			})
			assert.isUndefined(values[''])
		})

		it('empty string values should be properly recognized as empty string', async () => {
			var values = await getValues({
				path: PATH
			})
			assert.equal(values['emptyvalue'], '')
		})


		// NOTE: paths and value names are key insensitive and whenever its queries
		// reg command will always respond. But when 
		it('value name is case insensitive by default', async () => {
			var result = await getValues({
				path: PATH
			})
			assert.exists(result['somevalue'])
			result = await getValues({
				path: PATH
			})
			assert.notExists(result['SomeValue'])
		})

		it('can be switched to case sensitive', async () => {
			var result = await getValues({
				path: PATH,
				lowercase: false
			})
			assert.exists(result['SomeValue'])
			result = await getValues({
				path: PATH,
				lowercase: false
			})
			assert.notExists(result['somevalue'])
		})

		it('returns different values in 64-bit and 32-bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			var values64 = await getValues({
				path: PATH,
				bits: 64
			})
			var values32 = await getValues({
				path: PATH,
				bits: 32
			})

			assert.isNotEmpty(values64)
			assert.isNotEmpty(values32)

			assert.notEqual(values64.bits, values32.bits)
		})

		it('returns same values in 32-bit mode and for WOW6432Node key', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			var valuesWow = await getValues({
				path: PATH_32BIT,
				bits: 64
			})
			var values32 = await getValues({
				path: PATH,
				bits: 32
			})

			assert.isNotEmpty(valuesWow)
			assert.isNotEmpty(values32)

			assert.equal(valuesWow.bits, values32.bits)
		})



		describe('complex form', () => {

			it('returns an array of objects', async () => {
				var values = await getValues({
					path: PATH,
					format: 'complex'
				})
				assert.isArray(values)
				var entry = values[0]
				assert.isObject(entry)
			})

			it('entries are represented by objects', async () => {
				var values = await getValues({
					path: PATH,
					format: 'complex'
				})
				var entry = values[0]
				assert.isString(entry.name)
				assert.isTrue('data' in entry)
				assert.isString(entry.type)
			})

		})

	})


	describe('.getValue', () => {

		const PATH       = `${PATH_ROOT}\\.get() and .has()`
		const PATH_32BIT = `${PATH_ROOT_32BIT}\\.get() and .has()`


		it('is function', async () => {
			assert.isFunction(Registry.getValue)
		})

		it('returns undefined if the key path does not exist', async () => {
			var result = await getValue({
				path: PATH_NONEXISTENT
			})
			assert.isUndefined(result)
		})

		it('returns value of default entry', async () => {
			var result = await getValue({
				path: `${PATH}\\SubkeyWithDefaultValue`,
				name: ''
			})
			assert.equal(result, 'Default value content')
		})

		it('omitted name option falls back to default name (empty string)', async () => {
			var result = await getValue({
				path: `${PATH}\\SubkeyWithDefaultValue`
			})
			assert.equal(result, 'Default value content')
		})

		it('returns empty string if the value entry has empty string data', async () => {
			var result = await getValue({
				path: PATH,
				name: 'EmptyValue'
			})
			assert.equal(result, '')
		})

		it('returns string if the value entry has string data', async () => {
			var result = await getValue({
				path: `${PATH}\\Types`,
				name: 'StringValue'
			})
			assert.isString(result)
		})

		// NOTE: reg command is insensitive 
		it('value name is case insensitive by default', async () => {
			var result = await getValue({
				path: PATH,
				name: 'SomeValue'
			})
			assert.exists(result)
			result = await getValue({
				path: PATH,
				name: 'somevalue'
			})
			assert.exists(result)
		})

		//it('can be switched to case sensitive', async () => {
		//	var result = await Registry.getValue('HKCR\\*', 'AlwaysShowExt', true)
		//	assert.exists(result)
		//	result = await Registry.getValue('HKCR\\*', 'alwaysshowext', true)
		//	assert.notExists(result)
		//})

		it('returns undefined if the value entry exists, but does not value any data', async () => {
			var result = await getValue({
				path: `${PATH}\\EmptySubkey`,
				name: ''
			})
			assert.isUndefined(result)
		})

		it('returns different values in 64-bit and 32-bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			var value64 = await getValue({
				path: PATH,
				name: 'Bits',
				bits: 64
			})
			var value32 = await getValue({
				path: PATH,
				name: 'Bits',
				bits: 32
			})

			assert.equal(value64, 64)
			assert.equal(value32, 32)
		})

		it('returns same values for 32-bit mode and WOW6432Node key', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)
 
			var valueWow = await getValue({
				path: PATH_32BIT,
				name: 'Bits'
			})
			var value32 = await getValue({
				path: PATH,
				name: 'Bits',
				bits: 32
			})

			assert.equal(valueWow, value32)
		})


		describe('output type casting', () => {

			const PATH_TYPES = `${PATH}\\Types`


			it('reads REG_SZ as string', async () => {
				assert.isString(await getValue({
					path: PATH_TYPES,
					name: 'StringValue'
				}))
			})

			it('reads REG_DWORD as number', async () => {
				assert.isNumber(await getValue({
					path: PATH_TYPES,
					name: 'DwordValue'
				}))
			})

			it('reads REG_QWORD as BigInt', async () => {
				var data = await getValue({
					path: PATH_TYPES,
					name: 'QwordValue'
				})
				assert.equal(data.constructor.name, 'BigInt')
			})

			// Commented out because can't change BigInt from outside
			// it('reads REG_QWORD as string in 0x format if BigInt is not supported', async () => {
			// 	const NAME = 'casting-4'
			// 	await setValue(PATH, NAME, 1234, {type: 'REG_QWORD'})
			// 	var BigIntOrginal = global.BigInt
			// 	global.BigInt = undefined
			// 	var data = await getValue(PATH, NAME)
			// 	global.BigInt = BigIntOrginal
			// 	assert.isString(data)
			// 	assert.isTrue(data.startsWith('0x'))
			// })

			it('reads REG_BINARY as buffer', async () => {
				var data = await getValue({
					path: PATH_TYPES,
					name: 'BinaryValue'
				})
				assert.equal(data.constructor.name, 'Buffer')
			})
			
			it('reads REG_MULTI_SZ as array', async () => {
				assert.isArray(await getValue({
					path: PATH_TYPES,
					name: 'MultiStringValue'
				}))
			})

			// Should this test be moved to the .set() section?
			// it('string to REG_BINARY', async () => {
			// 	const NAME = 'binary-value'
			// 	var buffer = Buffer.from('Experience tranquility')
			// 	await deleteValue(PATH, NAME)
			// 	await setValue(PATH, NAME, buffer.toString(), {type: 'REG_BINARY'})
			// 	var {data, type} = await getValue(PATH, NAME, {format: 'complex'})
			// 	assert.equal(type, 'REG_BINARY')
			// 	assert.equal(data.toString(), buffer.toString())
			// })

		})

		describe('complex form', () => {

			it('returns an object', async () => {
				var entry = await getValue({
					path: PATH,
					name: 'SomeValue',
					format: 'complex'
				})
				assert.isObject(entry)
			})

			it(`has 'name', 'type' and 'data' fields`, async () => {
				var entry = await getValue({
					path: PATH,
					name: 'SomeValue',
					format: 'complex'
				})
				assert.isString(entry.name)
				assert.isTrue('data' in entry)
				assert.isString(entry.type)
			})

		})

	})




	describe('.getKey', () => {

		const PATH       = `${PATH_ROOT}\\.get() and .has()`
		const PATH_32BIT = `${PATH_ROOT_32BIT}\\.get() and .has()`


		it('is function', async () => {
			assert.isFunction(Registry.getKey)
		})

		it('returns undefined if the key path does not exist', async () => {
			var result = await getKey({
				path: PATH_NONEXISTENT
			})
			assert.equal(typeof result, 'undefined')
		})

		it('returns lowercase keys', async () => {
			var result = await getKey({
				path: PATH,
				lowercase: true
			})
			assert.isObject(result['emptysubkey'])
			assert.notExists(result['EmptySubkey'])
		})

		it('can return case sensitive keys', async () => {
			var result = await getKey({
				path: PATH,
				lowercase: false
			})
			assert.isObject(result['EmptySubkey'])
			assert.notExists(result['emptysubkey'])
		})

		it('returns different values in 64-bit and 32-bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			var key64 = await getKey({
				path: PATH,
				bits: 64
			})
			var key32 = await getKey({
				path: PATH,
				bits: 32
			})

			assert.isNotEmpty(key64)
			assert.isNotEmpty(key32)

			assert.notEqual(key64.$values.bits, key32.$values.bits)
		})

		it('returns same values in 32-bit mode and for WOW6432Node key', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			var keyWow = await getKey({
				path: PATH_32BIT
			})
			var key32 = await getKey({
				path: PATH,
				bits: 32
			})

			assert.isNotEmpty(keyWow)
			assert.isNotEmpty(key32)

			assert.equal(keyWow.$values.bits, key32.$values.bits)
		})

		it(`can change 'Registry.VALUES'`, async () => {
			var valuesOriginal = Registry.VALUES
			Registry.VALUES = '$newValues'
			var result = await getKey({
				path: PATH
			})
			Registry.VALUES = valuesOriginal

			assert.equal(result.$newValues.somevalue, 'Some content')
		})

		describe('simple format', () => {

			it('returns simple format', async () => {
				var result = await getKey({
					path: PATH
				})
				assert.isObject(result)
				assert.isObject(result.$values)
			})

			it('has keys', async () => {
				var result = await getKey({
					path: PATH
				})
				assert.exists(result['emptysubkey'])
				assert.exists(result['types'])
			})

			it('has values', async () => {
				var result = await getKey({
					path: PATH
				})
				assert.equal(result.$values.somevalue, 'Some content')
			})

			it('empty default value does show up in $values', async () => {
				var result = await getKey({
					path: `${PATH}\\SubkeyWithEmptyDefaultValue`
				})
				assert.isNotEmpty(Object.keys(result.$values))
				assert.isTrue(Object.keys(result.$values).includes(''))
			})

			it('undefined default value does not show up in $values', async () => {
				var result = await getKey({
					path: `${PATH}\\EmptySubkey`
				})
				assert.isEmpty(Object.keys(result.$values))
			})

			it('can work recursively', async () => {
				var result = await getKey({
					path: PATH,
					recursive: true
				})
				assert.isObject(result['subkeywithmoresubkeys'])
				assert.isObject(result['subkeywithmoresubkeys']['nestedsubkey'])
			})

		})

		describe('complex format', () => {

			it('returns complex format', async () => {
				var result = await getKey({
					path: PATH,
					format: 'complex'
				})
				assert.isObject(result)
				assert.isObject(result.keys) // TODO
				assert.isArray(result.values)
			})

			it('has keys', async () => {
				var result = await getKey({
					path: PATH,
					format: 'complex'
				})
				assert.exists(result.keys['emptysubkey'])
				assert.exists(result.keys['types'])
			})

			it('has values', async () => {
				var result = await getKey({
					path: `${PATH}\\SubkeyWithDefaultValue`,
					format: 'complex'
				})
				var defaultEntry = result.values.filter(entryObject => entryObject.name === '')[0]
				assert.isObject(defaultEntry)
				assert.equal(defaultEntry.name, '')
				assert.equal(defaultEntry.data, 'Default value content')
				assert.equal(defaultEntry.type, 'REG_SZ')
			})

			it('empty default value does show up in $values', async () => {
				var result = await getKey({
					path: `${PATH}\\SubkeyWithEmptyDefaultValue`,
					format: 'complex'
				})
				assert.isNotEmpty(result.values)
				assert.isTrue(result.values[0].name === '')
			})

			it('undefined default value does not show up in $values', async () => {
				var result = await getKey({
					path: `${PATH}\\EmptySubkey`,
					format: 'complex'
				})
				assert.isEmpty(result.values)
			})

			it('can work recursively', async () => {
				var result = await getKey({
					path: PATH,
					format: 'complex',
					recursive: true
				})
				assert.isObject(result.keys['subkeywithmoresubkeys'])
				assert.isObject(result.keys['subkeywithmoresubkeys'].keys)
				assert.isObject(result.keys['subkeywithmoresubkeys'].keys['nestedsubkey'])
			})

		})


	})




	describe('.get', () => {

		const PATH = `${PATH_ROOT}\\.get() and .has()`


		it('is function', async () => {
			assert.isFunction(Registry.get)
		})

		it('returns undefined if the key path does not exist', async () => {
			var result = await Registry.get(PATH_NONEXISTENT)
			assert.isUndefined(result)
		})

		it('only using one parameter serves as alias for .getKey', async () => {
			var result = await Registry.get(PATH)
			assert.isObject(result)
			assert.isString(result.$values['somevalue'])
		})

		it('using two parameters serves as alias for .getValue', async () => {
			var result = await Registry.get(PATH, 'somevalue')
			assert.isString(result)
		})

		it('works in 64-bit and 32-bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			var value64 = await Registry.get(PATH, 'bits', {bits: 64})
			var value32 = await Registry.get(PATH, 'bits', {bits: 32})

			assert.equal(value64, 64)
			assert.equal(value32, 32)
		})

		it('path can be set through options', async () => {
			var resultArg = await Registry.get(PATH)
			var resultObj = await Registry.get({path: PATH})

			assert.isObject(resultArg['subkeywithdefaultvalue'])
			assert.isObject(resultObj['subkeywithdefaultvalue'])

			assert.deepEqual(resultArg, resultObj)
		})

		it('value name can be set through options', async () => {
			var resultArg = await Registry.get(PATH, 'SomeValue')
			var resultObj = await Registry.get(PATH, {name: 'SomeValue'})

			assert.equal(resultArg, 'Some content')
			assert.equal(resultObj, 'Some content')
		})

		it('both value name and path can be set through options', async () => {
			var resultArg = await Registry.get(PATH, 'SomeValue')
			var resultObj = await Registry.get({path: PATH, name: 'SomeValue'})
			
			assert.equal(resultArg, 'Some content')
			assert.equal(resultObj, 'Some content')
		})

		it('can read unicode using method', async () => {
			try {
				await Registry.enableUnicode()
				var result = await Registry.get(PATH, 'UnicodeValue')
			} finally {
				await Registry.disableUnicode()
			}
			assert.equal(result, 'Коварные закорючки ツ')
		})

		it('can read unicode using option', async () => {
			var result = await Registry.get(PATH, 'UnicodeValue', {unicode: true})
			assert.equal(result, 'Коварные закорючки ツ')
		})

	})


	describe('.hasKey', () => {

		const PATH = `${PATH_ROOT}\\.get() and .has()`


		it('is function', async () => {
			assert.isFunction(Registry.hasKey)
		})

		it('returns true if key at given path exists', async () => {
			assert.isTrue(await hasKey({
				path: PATH
			}))
		})

		it(`returns false if key at given path doesn't exist`, async () => {
			assert.isFalse(await hasKey({
				path: PATH_NONEXISTENT
			}))
		})
		
		it('checks different keys in 64-bit and 32-bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			assert.isTrue(await hasKey({
				path: `${PATH}\\Subkey64bit`,
				bits: 64
			}))
			assert.isTrue(await hasKey({
				path: `${PATH}\\Subkey32bit`,
				bits: 32
			}))
		})

	})


	describe('.hasValue', () => {

		const PATH = `${PATH_ROOT}\\.get() and .has()`


		it('is function', async () => {
			assert.isFunction(Registry.hasValue)
		})

		it('returns true if value entry exists at given path', async () => {
			assert.isTrue(await hasValue({
				path: PATH,
				name: 'SomeValue'
			}))
		})

		it(`returns false if value entry doesn't exist at given path`, async () => {
			assert.isFalse(await hasValue({
				path: PATH,
				name: 'foo-bar non existent'
			}))
		})

		it('checks different values in 64-bit and 32-bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			assert.isTrue(await hasValue({
				path: PATH,
				name: 'Bits64',
				bits: 64
			}))

			assert.isTrue(await hasValue({
				path: PATH,
				name: 'Bits32',
				bits: 32
			}))
		})

	})


	describe('.has', () => {

		const PATH = `${PATH_ROOT}\\.get() and .has()`


		it('is function', async () => {
			assert.isFunction(Registry.has)
		})

		it('returns true if key at given path exists', async () => {
			assert.isTrue(await Registry.has(PATH))
		})

		it(`returns false if key at given path doesn't exist`, async () => {
			assert.isFalse(await Registry.has(PATH_NONEXISTENT))
		})

		it('returns true if value entry exists at given path', async () => {
			assert.isTrue(await Registry.has(PATH, 'SomeValue'))
		})

		it(`returns false if value entry doesn't exist at given path`, async () => {
			assert.isFalse(await Registry.has(PATH, 'foo-bar non existent'))
		})

		it('checks different keys in 64-bit and 32-bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			assert.isTrue(await Registry.has(`${PATH}\\Subkey64bit`, {bits: 64}))
			assert.isTrue(await Registry.has(`${PATH}\\Subkey32bit`, {bits: 32}))
		})

		it('checks different values in 64-bit and 32-bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			assert.isTrue(await Registry.has(PATH, 'Bits64', {bits: 64}))
			assert.isTrue(await Registry.has(PATH, 'Bits32', {bits: 32}))
		})

		it('path can be set through options', async () => {
			assert.isTrue(await Registry.has(PATH))
			assert.isTrue(await Registry.has({path: PATH}))
			assert.isFalse(await Registry.has(PATH_NONEXISTENT))
			assert.isFalse(await Registry.has({path: PATH_NONEXISTENT}))
		})

		it('value name can be set through options', async () => {
			assert.isTrue(await Registry.has(PATH, 'SomeValue'))
			assert.isTrue(await Registry.has(PATH, {name: 'SomeValue'}))
			assert.isFalse(await Registry.has(PATH, 'foo-bar non existent'))
			assert.isFalse(await Registry.has(PATH, {name: 'foo-bar non existent'}))
		})

		it('both value name and path can be set through options', async () => {
			assert.isTrue(await Registry.has(PATH, 'SomeValue'))
			assert.isTrue(await Registry.has({path: PATH, name: 'SomeValue'}))
			assert.isFalse(await Registry.has(PATH, 'foo-bar non existent'))
			assert.isFalse(await Registry.has({path: PATH, name: 'foo-bar non existent'}))
		})

	})


	describe('.deleteKey', () => {

		const PATH = `${PATH_ROOT}\\.delete()\\.deleteKey()`


		it('is function', async () => {
			assert.isFunction(Registry.deleteKey)
		})

		it('deletes the key at given path', async () => {
			const path = `${PATH}\\KeyToBeDeleted-1`
			assert.isTrue(await Registry.has(path))
			await deleteKey({
				path
			})
			assert.isFalse(await Registry.has(path))
		})

		it('deletion of an existing key does not throw', async () => {
			const path = `${PATH}\\KeyToBeDeleted-2`
			await assert.willNotThrow(deleteKey({
				path
			}))
		})

		it('deletion of nonexisting key does not throw', async () => {
			await assert.willNotThrow(deleteKey({
				path: PATH_NONEXISTENT
			}))
		})

		it('deletes different keys in 64-bit and 32-bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			const path = `${PATH}\\KeyToBeDeleted-6432`
			
			assert.isTrue(await Registry.has(path, {bits: 64}))
			assert.isTrue(await Registry.has(path, {bits: 32}))

			await deleteKey({
				path,
				bits: 64
			})

			assert.isFalse(await Registry.has(path, {bits: 64}))
			assert.isTrue(await Registry.has(path, {bits: 32}))

			await deleteKey({
				path,
				bits: 32
			})

			assert.isFalse(await Registry.has(path, {bits: 32}))
		})

	})


	describe('.deleteValue', () => {

		const PATH = `${PATH_ROOT}\\.delete()\\.deleteValue()`


		it('is function', async () => {
			assert.isFunction(Registry.deleteValue)
		})

		it('deletes the value at given path', async () => {
			const NAME = 'ValueToBeDeleted-1'

			assert.isTrue(await Registry.has(PATH, NAME))

			await deleteValue({
				path: PATH,
				name: NAME
			})

			assert.isFalse(await Registry.has(PATH, NAME))
		})

		it('deletion of an existing value entry does not throw', async () => {
			const NAME = 'ValueToBeDeleted-2'

			assert.isTrue(await Registry.has(PATH, NAME))

			await assert.willNotThrow(deleteValue({
				path: PATH,
				name: NAME
			}))
		})

		it('deletion of nonexisting value does not throw', async () => {
			const NAME = 'ValueToBeDeleted-3'

			await deleteValue({
				path: PATH,
				name: NAME
			}).catch(noop)

			await assert.willNotThrow(deleteValue({
				path: PATH,
				name: NAME
			}))
		})

		it('deletes different values in 64-bit and 32-bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)
			const NAME = 'ValueToBeDeleted-6432'
			
			assert.isTrue(await Registry.has(PATH, NAME, {bits: 64}))
			assert.isTrue(await Registry.has(PATH, NAME, {bits: 32}))

			await deleteValue({
				path: PATH,
				name: NAME,
				bits: 64
			})

			assert.isFalse(await Registry.has(PATH, NAME, {bits: 64}))
			assert.isTrue(await Registry.has(PATH, NAME, {bits: 32}))

			await deleteValue({
				path: PATH,
				name: NAME,
				bits: 32
			})

			assert.isFalse(await Registry.has(PATH, NAME, {bits: 32}))
		})

	})


	describe('.delete', () => {

		const PATH = `${PATH_ROOT}\\.delete()\\.delete()`


		it('is function', async () => {
			assert.isFunction(Registry.delete)
		})

		it('using one parameter serves as alias for .deleteKey', async () => {
			const path = `${PATH}\\KeyToBeDeleted-1`
			assert.isTrue(await Registry.has(path))
			await Registry.delete(path)
			assert.isFalse(await Registry.has(path))
		})

		it('using two parameters serves as alias for .deleteValue', async () => {
			const NAME = 'ValueToBeDeleted-1'
			assert.isTrue(await Registry.has(PATH))
			assert.isTrue(await Registry.has(PATH, NAME))

			await Registry.delete(PATH, NAME)

			assert.isTrue(await Registry.has(PATH))
			assert.isFalse(await Registry.has(PATH, NAME))
		})

		it('deletes different keys in 64-bit and 32-bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			const path = `${PATH}\\KeyToBeDeleted-6432`
			
			assert.isTrue(await Registry.has(path, {bits: 64}))
			assert.isTrue(await Registry.has(path, {bits: 32}))

			await Registry.delete(path, {bits: 64})

			assert.isFalse(await Registry.has(path, {bits: 64}))
			assert.isTrue(await Registry.has(path, {bits: 32}))

			await Registry.delete(path, {bits: 32})

			assert.isFalse(await Registry.has(path, {bits: 32}))
		})

		it('deletes different values in 64-bit and 32-bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)
			const NAME = 'ValueToBeDeleted-6432'
			
			assert.isTrue(await Registry.has(PATH, NAME, {bits: 64}))
			assert.isTrue(await Registry.has(PATH, NAME, {bits: 32}))

			await Registry.delete(PATH, NAME, {bits: 64})

			assert.isFalse(await Registry.has(PATH, NAME, {bits: 64}))
			assert.isTrue(await Registry.has(PATH, NAME, {bits: 32}))

			await Registry.delete(PATH, NAME, {bits: 32})

			assert.isFalse(await Registry.has(PATH, NAME, {bits: 32}))
		})

		it('path can be set through options', async () => {
			const path = `${PATH}\\KeyToBeDeleted-2`

			assert.isTrue(await Registry.has(path))
			await Registry.delete(path)
			assert.isFalse(await Registry.has(path))
		})

		it('value name can be set through options', async () => {
			const NAME = 'ValueToBeDeleted-2'

			assert.isTrue(await Registry.has(PATH, NAME))
			await Registry.delete(PATH, {name: NAME})
			assert.isFalse(await Registry.has(PATH, NAME))
		})

		it('both value name and path can be set through options', async () => {
			const NAME = 'ValueToBeDeleted-3'

			assert.isTrue(await Registry.has(PATH, NAME))
			await Registry.delete({path: PATH, name: NAME})
			assert.isFalse(await Registry.has(PATH, NAME))
		})

	})



	describe('.setKey', () => {

		const PATH = `${PATH_ROOT}\\.set()`


		it('is function', async () => {
			assert.isFunction(Registry.setKey)
		})

		it('creates new key', async () => {
			const path = `${PATH}\\NewKey-${generateUID()}`
			
			assert.isFalse(await Registry.has(path))
			await setKey({
				path
			})
			assert.isTrue(await Registry.has(path))
		})

		it('overwrites already existing key', async () => {
			const path = `${PATH}\\NewKey-${generateUID()}`

			await setKey({
				path
			}).catch(noop)

			await setKey({
				path
			})

			assert.isTrue(await Registry.has(path))
		})

		it('creates different keys in 64-bit and 32-bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)
			const path = `${PATH}\\NewKey-${generateUID()}`

			assert.isFalse(await Registry.has(path, {bits: 64}))
			assert.isFalse(await Registry.has(path, {bits: 32}))

			await setKey({
				path: path,
				bits: 64
			})

			assert.isTrue(await Registry.has(path, {bits: 64}))
			assert.isFalse(await Registry.has(path, {bits: 32}))

			await setKey({
				path: path,
				bits: 32
			})

			assert.isTrue(await Registry.has(path, {bits: 32}))
		})

	})


	describe('.setValue', () => {

		const PATH = `${PATH_ROOT}\\.set()`

		async function getEntryType(NAME) {
			// get complex object
			var result = await Registry.get(PATH, NAME, {format: 'complex'})
			return result.type
		}

		it('is function', async () => {
			assert.isFunction(Registry.setValue)
		})

		it('creates new value entry', async () => {
			const NAME = `NewValue-${generateUID()}`
			const DATA = 'this is the newly created value data'

			assert.isFalse(await Registry.has(PATH, NAME))
			await setValue({
				path: PATH,
				name: NAME,
				data: DATA
			})
			assert.equal(await Registry.get(PATH, NAME), DATA)
		})

		it('overwrites existing value entry', async () => {
			const NAME = `NewValue-${generateUID()}`
			const INITIAL_DATA = 'initial data'
			const FINAL_DATA = 'expected final data'
			
			await setValue({
				path: PATH,
				name: NAME,
				data: INITIAL_DATA
			})
			assert.equal(await Registry.get(PATH, NAME), INITIAL_DATA)

			await setValue({
				path: PATH,
				name: NAME,
				data: FINAL_DATA
			})
			assert.equal(await Registry.get(PATH, NAME), FINAL_DATA)
		})

		it(`creates empty REG_SZ value if the 'data' option isn't specified`, async () => {
			const NAME = `NewValue-${generateUID()}`

			await setValue({
				path: PATH,
				name: NAME
			})

			var value = await Registry.get(PATH, NAME, {format: 'complex', lowercase: false})
			assert.equal(value.name, NAME)
			assert.equal(value.type, 'REG_SZ')
			assert.equal(value.data, '')
		})

		it(`also creates key if the path doesn't exist`, async () => {
			const path = `${PATH}\\NewKey-${generateUID()}`
			const NAME = `NewValue-${generateUID()}`
			const DATA = 'this is the newly created value data'

			assert.isFalse(await Registry.has(`${path}\\deep`))
			await setValue({
				path: `${path}\\deep\\sub\\key`,
				name: NAME,
				data: DATA
			})
			assert.isTrue(await Registry.has(`${path}\\deep`))
		})

		it('creates different values in 64-bit and 32-bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			const NAME = `bits-${generateUID()}`

			await setValue({
				path: PATH,
				name: NAME,
				data: '64-bit', 
				bits: 64
			})
			await setValue({
				path: PATH,
				name: NAME,
				data: '32-bit', 
				bits: 32
			})

			assert.equal(await Registry.get(PATH, NAME, {bits: 64}), '64-bit')
			assert.equal(await Registry.get(PATH, NAME, {bits: 32}), '32-bit')
		})


		describe('input data type inferring', () => {

			it('string as REG_SZ', async () => {
				const NAME = `TypeInfer-${generateUID()}`
				await setValue({
					path: PATH,
					name: NAME,
					data: 'some string'
				})
				assert.equal(await getEntryType(NAME), 'REG_SZ')
			})

			it('number as REG_DWORD', async () => {
				const NAME = `TypeInfer-${generateUID()}`
				await setValue({
					path: PATH,
					name: NAME,
					data: 123
				})
				assert.equal(await getEntryType(NAME), 'REG_DWORD')
			})

			it('bigint as REG_QWORD', async () => {
				const NAME = `TypeInfer-${generateUID()}`
				await setValue({
					path: PATH,
					name: NAME,
					data: 123n
				})
				assert.equal(await getEntryType(NAME), 'REG_QWORD')
			})

			it('array as REG_MULTI_SZ', async () => {
				const NAME = `TypeInfer-${generateUID()}`
				await setValue({
					path: PATH,
					name: NAME,
					data: ['Angela Ziegler', 'Winston', 'Mei-Ling Zhou']
				})
				assert.equal(await getEntryType(NAME), 'REG_MULTI_SZ')
			})

			it('buffer as REG_BINARY', async () => {
				const NAME = `TypeInfer-${generateUID()}`
				await setValue({
					path: PATH,
					name: NAME,
					data: Buffer.from('Zenyatta')
				})
				assert.equal(await getEntryType(NAME), 'REG_BINARY')
			})

		})


		describe('storing and retrieving the same value', () => {

			it('REG_SZ string', async () => {
				const NAME = `NewValue-${generateUID()}`
				const DATA = 'Some string'
				await setValue({
					path: PATH,
					name: NAME,
					data: DATA,
					type: 'REG_SZ'
				})
				assert.equal(await Registry.get(PATH, NAME), DATA)
			})

			it('REG_DWORD number', async () => {
				const NAME = `NewValue-${generateUID()}`
				const DATA = 123
				await setValue({
					path: PATH,
					name: NAME,
					data: DATA,
					type: 'REG_DWORD'
				})
				assert.equal(await Registry.get(PATH, NAME), DATA)
			})

			it('REG_DWORD string', async () => {
				const NAME = `NewValue-${generateUID()}`
				const DATA = 123
				await setValue({
					path: PATH,
					name: NAME,
					data: DATA.toString(),
					type: 'REG_DWORD'
				})
				assert.equal(await Registry.get(PATH, NAME), DATA)
			})

			it('REG_QWORD number', async () => {
				const NAME = `NewValue-${generateUID()}`
				const DATA = 123n
				await setValue({
					path: PATH,
					name: NAME,
					data: DATA,
					type: 'REG_QWORD'
				})
				assert.equal(await Registry.get(PATH, NAME), DATA)
			})

			it('REG_QWORD string', async () => {
				const NAME = `NewValue-${generateUID()}`
				const DATA = 123n
				await setValue({
					path: PATH,
					name: NAME,
					data: DATA.toString(),
					type: 'REG_QWORD'
				})
				assert.equal(await Registry.get(PATH, NAME), DATA)
			})

			it('REG_MULTI_SZ array', async () => {
				const NAME = `NewValue-${generateUID()}`
				const DATA = ['Angela Ziegler', 'Winston', 'Mei-Ling Zhou']
				await setValue({
					path: PATH,
					name: NAME,
					data: DATA,
					type: 'REG_MULTI_SZ'
				})
				var retrievedValue = await Registry.get(PATH, NAME)
				assert.isArray(retrievedValue)
				assert.sameMembers(retrievedValue, DATA)
				assert.equal(retrievedValue.length, DATA.length)
			})

			it('REG_MULTI_SZ string', async () => {
				const NAME = `NewValue-${generateUID()}`
				const DATA = ['Angela Ziegler', 'Winston', 'Mei-Ling Zhou']
				await setValue({
					path: PATH,
					name: NAME,
					data: DATA.join('\0'),
					type: 'REG_MULTI_SZ'
				})
				var retrievedValue = await Registry.get(PATH, NAME)
				assert.isArray(retrievedValue)
				assert.sameMembers(retrievedValue, DATA)
				assert.equal(retrievedValue.length, DATA.length)
			})

			it('REG_BINARY', async () => {
				const NAME = `NewValue-${generateUID()}`
				const DATA = Buffer.from('Experience tranquility')
				await setValue({
					path: PATH,
					name: NAME,
					data: DATA.toString(),
					type: 'REG_BINARY'
				})
				var retrievedValue = await Registry.get(PATH, NAME)
				assert.equal(retrievedValue.toString(), DATA.toString())
			})

		})


		describe('input data type override', () => {

			it('explicitly stores string as REG_DWORD', async () => {
				const NAME = `TypeOverride-${generateUID()}`
				await setValue({
					path: PATH,
					name: NAME,
					data: '123',
					type: 'REG_DWORD'
				})
				assert.equal(await getEntryType(NAME), 'REG_DWORD')
			})

			it('explicitly stores string as REG_QWORD', async () => {
				const NAME = `TypeOverride-${generateUID()}`
				await setValue({
					path: PATH,
					name: NAME,
					data: '123',
					type: 'REG_QWORD'
				})
				assert.equal(await getEntryType(NAME), 'REG_QWORD')
			})

			it('explicitly stores buffer as REG_SZ', async () => {
				const NAME = `TypeOverride-${generateUID()}`
				await setValue({
					path: PATH,
					name: NAME,
					data: Buffer.from('Zenyatta'),
					type: 'REG_SZ'
				})
				assert.equal(await getEntryType(NAME), 'REG_SZ')
			})

			it('explicitly stores string as REG_BINARY', async () => {
				const NAME = `TypeOverride-${generateUID()}`
				await setValue({
					path: PATH,
					name: NAME,
					data: 'Experience tranquility',
					type: 'REG_BINARY'
				})
				assert.equal(await getEntryType(NAME), 'REG_BINARY')
			})

		})


		describe('type name alias', () => {

			it('sz as REG_SZ', async () => {
				const NAME = `NewValue-${generateUID()}`
				await setValue({
					path: PATH,
					name: NAME,
					data: 'Some string',
					type: 'sz'
				})
				assert.equal(await getEntryType(NAME), 'REG_SZ')
			})

			it('dword as REG_DWORD', async () => {
				const NAME = `NewValue-${generateUID()}`
				await setValue({
					path: PATH,
					name: NAME,
					data: 123,
					type: 'dword'
				})
				assert.equal(await getEntryType(NAME), 'REG_DWORD')
			})

		})


	})


	describe('.set', () => {

		const PATH = `${PATH_ROOT}\\.set()`


		it('is function', async () => {
			assert.isFunction(Registry.set)
		})

		it('only using one parameter serves as alias for .setKey', async () => {
			const path = `${PATH}\\NewKey-${generateUID()}`
			
			assert.isFalse(await Registry.has(path))
			await Registry.set(path)
			assert.isTrue(await Registry.has(path))
		})

		it('using two+ parameters serves as alias for .setValue', async () => {
			const NAME1 = `NewValue-${generateUID()}`
			const NAME2 = `NewValue-${generateUID()}`
			const DATA = 'this is the newly created value data'

			assert.isFalse(await Registry.has(PATH, NAME1))
			assert.isFalse(await Registry.has(PATH, NAME2))

			await Registry.set(PATH, NAME1)
			await Registry.set(PATH, NAME2, DATA)

			assert.equal(await Registry.get(PATH, NAME1), '')
			assert.equal(await Registry.get(PATH, NAME2), DATA)
		})

		it(`complex`, async () => {
			const path = `${PATH}\\NewKey-${generateUID()}`
			assert.isFalse(await Registry.has(path))

			await Registry.set(path, {
				'': `Soldiers. Scientists. Adventurers. Oddities.`,
				leader: 'Jack Morrison',
				scientists: ['Angela Ziegler', 'Winston', 'Mei-Ling Zhou']
			})

			assert.isTrue(await Registry.has(path))
			assert.isTrue(await Registry.has(path, 'leader'))
			assert.equal((await Registry.get(path, 'scientists')).length, 3)
		})

		it(`nested complex`, async () => {
			const path = `${PATH}\\NewKey-${generateUID()}`
			const subpath = `${path}\\Blackwatch`
			assert.isFalse(await Registry.has(path))

			await Registry.set(path, {
				'': `Soldiers. Scientists. Adventurers. Oddities.`,
				leader: 'Jack Morrison',
				scientists: ['Angela Ziegler', 'Winston', 'Mei-Ling Zhou'],
				Blackwatch: {
					leader: 'Gabriel Reyes'
				}
			})

			assert.isTrue(await Registry.has(path))
			assert.isTrue(await Registry.has(subpath))
			assert.equal(await Registry.get(path, 'leader'), 'Jack Morrison')
			assert.equal(await Registry.get(subpath, 'leader'), 'Gabriel Reyes')
		})

		it('creates different values in 64-bit and 32-bit modes', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)
			const path = `${PATH}\\NewKey-${generateUID()}`

			assert.isFalse(await Registry.has(path, {bits: 64}))
			assert.isFalse(await Registry.has(path, {bits: 32}))

			await Registry.set(path, 'bits', '64-bit', {bits: 64})
			await Registry.set(path, 'bits', '32-bit', {bits: 32})

			assert.equal(await Registry.get(path, 'bits', {bits: 64}), '64-bit')
			assert.equal(await Registry.get(path, 'bits', {bits: 32}), '32-bit')
		})

		it(`last argument can be explicitly marked as options object (two arguments)`, async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)
			const path = `${PATH}\\NewKey-${generateUID()}`

			assert.isFalse(await Registry.has(path, {bits: 64}))
			assert.isFalse(await Registry.has(path, {bits: 32}))

			await Registry.set(path, {bits: 32})
			await Registry.set(path, {bits: 32, [Registry.IS_OPTIONS]: true})

			// Value 'bits' with content '32'
			assert.equal(await Registry.get(path, 'bits'), 32)
			// Empty key inside of Wow6432Node
			assert.isTrue(await Registry.has(path, {bits: 32}))
			assert.notEqual(await Registry.get(path, 'bits', {bits: 32}), 32)
		})

		it(`last argument can be explicitly marked as options object (three arguments)`, async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)
			const path = `${PATH}\\NewKey-${generateUID()}`
			const secondArg = `subkey`

			assert.isFalse(await Registry.has(path, {bits: 64}))
			assert.isFalse(await Registry.has(path, {bits: 32}))

			await Registry.set(path, secondArg, {bits: 32})
			await Registry.set(path, secondArg, {bits: 32, [Registry.IS_OPTIONS]: true})

			// Value 'bits' with content '32'
			assert.equal(await Registry.get(`${path}\\${secondArg}`, 'bits'), 32)
			// Empty key inside of Wow6432Node
			assert.isTrue(await Registry.has(path, secondArg, {bits: 32}))
			assert.notEqual(await Registry.get(`${path}\\${secondArg}`, 'bits', {bits: 32}), 32)
		})


		it(`value data can be set through options ('$isOptions' needed)`, async () => {
			const NAME = `NewValue-${generateUID()}`
			const DATA = 'this is the newly created value data'

			assert.isFalse(await Registry.has(PATH, NAME))
			await Registry.set(PATH, NAME, {data: DATA, [Registry.IS_OPTIONS]: true})
			assert.equal(await Registry.get(PATH, NAME), DATA)
		})

		it(`value data and name can be set through options ('$isOptions' needed)`, async () => {
			const NAME = `NewValue-${generateUID()}`
			const DATA = 'this is the newly created value data'

			assert.isFalse(await Registry.has(PATH, NAME))
			await Registry.set(PATH, {name: NAME, data: DATA, [Registry.IS_OPTIONS]: true})
			assert.equal(await Registry.get(PATH, NAME), DATA)
		})

		it('path can be set through options', async () => {
			const path = `${PATH}\\NewKey-${generateUID()}`

			assert.isFalse(await Registry.has(path))
			await Registry.set({path})
			assert.isTrue(await Registry.has(path))
		})

		it('all arguments can be set through options', async () => {
			const NAME = `NewValue-${generateUID()}`
			const DATA = 'this is the newly created value data'

			assert.isFalse(await Registry.has(PATH, NAME))
			await Registry.set({path: PATH, name: NAME, data: DATA})
			assert.equal(await Registry.get(PATH, NAME), DATA)
		})

	})


	describe('.clearValues', () => {

		const PATH = `${PATH_ROOT}\\.delete()\\.clearValues()`


		it('is function', async () => {
			assert.isFunction(Registry.clearValues)
		})

		it('deletes all values at given path', async () => {
			const path = `${PATH}\\ValuesOnly`

			assert.isTrue(await Registry.has(path))
			assert.isTrue(await Registry.has(path, ''))
			assert.isTrue(await Registry.has(path, 'ValueToBeDeleted'))

			await clearValues({
				path
			})

			assert.equal(Object.keys(await getValues({path})).length, 0)
		})

		it('retains subkeys', async () => {
			const path = `${PATH}\\ValuesAndSubkeys`

			assert.isTrue(await Registry.has(path))
			assert.isTrue(await Registry.has(path, 'ValueToBeDeleted'))
			assert.isTrue(await Registry.has(`${path}\\SubkeyToBeAlive`))

			await clearValues({
				path
			})

			assert.notEqual(Object.keys(await getKeys({path: PATH})).length, 0)
		})

	})


	describe('.clearKeys', () => {

		const PATH = `${PATH_ROOT}\\.delete()\\.clearKeys()`


		it('is function', async () => {
			assert.isFunction(Registry.clearKeys)
		})

		it('deletes all subkeys', async () => {
			const doomedPath = `${PATH}\\KeyToBeDeleted`

			assert.isTrue(await Registry.has(doomedPath))
			await clearKeys({
				path: PATH
			})

			assert.equal(Object.keys(await getKeys({path: PATH})).length, 0)
		})

	})


	describe('.clear', () => {

		const PATH = `${PATH_ROOT}\\.delete()\\.clear()`

		it('is function', async () => {
			assert.isFunction(Registry.clear)
		})

		it('deletes all values and subkeys', async () => {
			const doomedPath = `${PATH}\\KeyToBeDeleted`
			const doomedKey = `ValueToBeDeleted`

			assert.isTrue(await Registry.has(doomedPath))
			assert.isTrue(await Registry.has(PATH, doomedKey))

			await Registry.clear(PATH)

			var result = await Registry.get(PATH, {format: 'complex'})
			assert.isEmpty(result.keys)
			assert.isEmpty(result.values)
		})

	})


	describe(`default value`, () => {

		const PATH = `${PATH_ROOT}\\.set()\\Default value`

		function createBeforeAndAfter() {
			before(async () => {
				await Registry.delete(PATH).catch(noop)
				await Registry.set(PATH)
			})
			after(() => Registry.delete(PATH))
		}


		describe(`new key creation`, () => {
			createBeforeAndAfter()
			it('.getValue returns undefined', async () => {
				assert.isUndefined(await getValue({path: PATH, name: ''}))
			})
			it('.hasValue does not throw', async () => {
				assert.willNotThrow(hasValue({path: PATH, name: ''}))
			})
			it('.getValues does not include it', async () => {
				assert.equal((await getValues({path: PATH, format: 'complex'})).length, 0)
			})
		})

		describe(`setting data to empty string`, () => {
			createBeforeAndAfter()
			it('.getValue returns empty string', async () => {
				await Registry.set(PATH, '', '')
				assert.equal(await getValue({path: PATH, name: ''}), '')
			})
			it('.hasValue does not throw', async () => {
				await Registry.set(PATH, '', '')
				assert.willNotThrow(hasValue({path: PATH, name: ''}))
			})
			it('.getValues includes it', async () => {
				assert.notEqual((await getValues({path: PATH, format: 'complex'})).length, 0)
			})
		})

		describe(`setting data to string`, () => {
			createBeforeAndAfter()
			it('.getValue returns string', async () => {
				await Registry.set(PATH, '', 'harmony')
				assert.equal(await getValue({path: PATH, name: ''}), 'harmony')
			})
			it('.hasValue does not throw', async () => {
				await Registry.set(PATH, '', 'harmony')
				assert.willNotThrow(hasValue({path: PATH, name: 'harmony'}))
			})
			it('.getValues includes it', async () => {
				await Registry.set(PATH, '', 'harmony')
				assert.notEqual((await getValues({path: PATH, format: 'complex'})).length, 0)
			})
		})

	})


	describe('global options', () => {

		const PATH = `${PATH_ROOT}\\.get() and .has()`


		after(() => {
			Registry.format = 'simple'
			Registry.bits = null
		})

		it(`Registry.format = 'complex' is used for all calls`, async () => {
			assert.isObject(await getValues({path: PATH}))
			assert.isArray(await getValues({path: PATH, format: 'complex'}))

			Registry.format = 'complex'
			assert.isArray(await getValues({path: PATH}))
			Registry.format = 'simple'
		})

		it(`Registry.format can by bypassed by specifying custom options`, async () => {
			Registry.format = 'complex'
			assert.isArray(await getValues({path: PATH}))
			assert.isObject(await getValues({path: PATH, format: 'simple'}))
			Registry.format = 'simple'
		})

		it(`Registry.lowercase = false is used for all calls`, async () => {
			assert.property(await Registry.get(PATH), 'subkeywithdefaultvalue')
			assert.notProperty(await Registry.get(PATH), 'SubkeyWithDefaultValue')

			Registry.lowercase = false
			assert.property(await Registry.get(PATH), 'SubkeyWithDefaultValue')
			assert.notProperty(await Registry.get(PATH), 'subkeywithdefaultvalue')
			Registry.lowercase = true
		})

		it(`Registry.lowercase can by bypassed by specifying custom options`, async () => {
			Registry.lowercase = false
			assert.property(await Registry.get(PATH), 'SubkeyWithDefaultValue')
			assert.property(await Registry.get(PATH, {lowercase: true}), 'subkeywithdefaultvalue')
			Registry.lowercase = true
		})

		it(`Registry.bits is used for all calls`, async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)
			const NAME = 'Bits'

			assert.equal(await Registry.get(PATH, NAME), 64)
			Registry.bits = 32
			assert.equal(await Registry.get(PATH, NAME), 32)
			Registry.bits = 64
			assert.equal(await Registry.get(PATH, NAME), 64)
			Registry.bits = null
		})

		it(`Registry.bits can by bypassed by specifying custom options`, async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)
			const NAME = 'Bits'

			assert.equal(await Registry.get(PATH, NAME), 64)
			Registry.bits = 32
			assert.equal(await Registry.get(PATH, NAME), 32)
			assert.equal(await Registry.get(PATH, NAME, {bits: 64}), 64)
			Registry.bits = null
		})

	})

})



describe('new Registry', () => {

	describe('._formatArgs', () => {

		const PATH = `${PATH_ROOT}\\.get() and .has()`
		var reg = new Registry(PATH)


		it('handles subpath-less args', async () => {
			var result = reg._formatArgs(['name'])
			assert.equal(result.path, PATH)
			assert.equal(result.name, 'name')
		})

		it('handles args with subpath', async () => {
			var result = reg._formatArgs(['\\Subpath', 'name'])
			assert.equal(result.path, `${PATH}\\Subpath`)
		})

		it('handles args with relative subpath', async () => {
			var result = reg._formatArgs(['.\\Subpath', 'name'])
			assert.equal(result.path, `${PATH}\\Subpath`)
		})

		it('handles subpath with forward slashes', async () => {
			var result = reg._formatArgs(['./Subpath', 'name'])
			assert.equal(result.path, `${PATH}\\Subpath`)
		})

	})


	describe('.get', () => {

		var reg = new Registry(`${PATH_ROOT}\\.get() and .has()`)


		it(`.get(name) returns the value if it exists`, async () => {
			assert.isString(await reg.get('SomeValue'))
		})

		it(`.get(name) returns undefined if the value doesn't exist`, async () => {
			assert.isUndefined(await reg.get('foobar'))
		})

		it(`.get(subpath) returns the subkey if it exists`, async () => {
			assert.property(await reg.get('\\SubkeyWithMoreSubkeys'), 'nestedsubkey')
		})

		it(`.get(subpath) returns undefined if the subkey doesn't exist`, async () => {
			assert.isUndefined(await reg.get('\\foobar'))
		})

		it(`.get(subpath, name) returns the value if it and the subkey exists`, async () => {
			assert.equal(await reg.get('\\SubkeyWithDefaultValue', ''), 'Default value content')
		})

		it(`.get(subpath, name) returns undefined or the subkey of the value doesn't exist`, async () => {
			assert.isUndefined(await reg.get('\\SubkeyWithDefaultValue', 'foobar'))
			assert.isUndefined(await reg.get('\\foobar', ''))
		})

	})

	describe('.has', () => {

		var reg = new Registry(`${PATH_ROOT}\\.get() and .has()`)


		it(`.has(name) returns true if the value exists`, async () => {
			assert.isTrue(await reg.has('SomeValue'))
		})

		it(`.has(name) returns false if the value doesn't exist`, async () => {
			assert.isFalse(await reg.has('foobar'))
		})

		it(`.has(subpath) returns true if the subkey exists`, async () => {
			assert.isTrue(await reg.has('\\Types'))
		})

		it(`.has(subpath) returns false if the subkey doesn't exist`, async () => {
			assert.isFalse(await reg.has('\\foobar'))
		})

		it(`.has(subpath, name) returns true if the subkey and the value exists`, async () => {
			assert.isTrue(await reg.has('\\Types', 'StringValue'))
		})

		it(`.has(subpath, name) returns false if the subkey or the value doesn't exist`, async () => {
			assert.isFalse(await reg.has('\\foobar', 'foobar'))
			assert.isFalse(await reg.has('\\Types', 'foobar'))
		})

	})

	describe('.set', () => {
			
		const PATH = `${PATH_ROOT}\\.set()`
		var reg = new Registry(PATH)


		it(`.set(name) creates the value exists if it doesn't exist`, async () => {
			const NAME = `NewValue-${generateUID()}`
			const DATA = 'this is the newly created value data'

			assert.isFalse(await Registry.has(PATH, NAME))
			await reg.set(NAME, DATA)
			assert.isTrue(await Registry.has(PATH, NAME))
			assert.equal(await Registry.get(PATH, NAME), DATA)
		})

		it(`.set(name) rewrites the value if it exists`, async () => {
			const NAME = `NewValue-${generateUID()}`
			const INITIAL_DATA = 'initial data'
			const FINAL_DATA = 'expected final data'

			await reg.set(NAME, INITIAL_DATA)
			await reg.set(NAME, FINAL_DATA)

			assert.equal(await Registry.get(PATH, NAME), FINAL_DATA)
		})

		it(`.set(subpath) creates subkey`, async () => {
			const subpath = `\\NewKey-${generateUID()}`
			await reg.set(subpath)
			assert.isTrue(await Registry.has(PATH+subpath))
		})

		it(`.set(subpath) does nothing if the subkey already exists`, async () => {
			const subpath = `\\NewKey-${generateUID()}`
			await reg.set(subpath)
			await reg.set(subpath)
			assert.isTrue(await Registry.has(PATH+subpath))
		})

		it(`.set(subpath, name) creates subkey with an empty named value`, async () => {
			const subpath = `\\NewKey-${generateUID()}`
			const NAME = `NewValue-${generateUID()}`

			await reg.set(subpath, NAME)
			assert.isTrue(await Registry.has(PATH+subpath, NAME))
			assert.equal(await Registry.get(PATH+subpath, NAME), '')
		})

		it(`.set(subpath, '', data) creates subkey with a default value`, async () => {
			const subpath = `\\NewKey-${generateUID()}`
			const DATA = 'this is the newly created value data'

			await reg.set(subpath, '', DATA)

			assert.isTrue(await Registry.has(PATH+subpath))
			assert.equal(await Registry.get(PATH+subpath, ''), DATA)
		})

		it(`.set(subpath, name, data) creates subkey and a named value`, async () => {
			const subpath = `\\NewKey-${generateUID()}`
			const NAME = `NewValue-${generateUID()}`
			const DATA = 'this is the newly created value data'

			assert.isFalse(await Registry.has(PATH+subpath, NAME))
			await reg.set(subpath, NAME, DATA)
			assert.isTrue(await Registry.has(PATH+subpath, NAME))
			assert.equal(await Registry.get(PATH+subpath, NAME), DATA)
		})

	})


	describe('.delete', () => {

		const PATH = `${PATH_ROOT}\\.delete()\\InstanceMode`
		var reg = new Registry(PATH)


		it(`.delete(name) deletes the value if it exists`, async () => {
			const NAME = 'ValueToBeDeleted'
			assert.isTrue(await reg.has(NAME))
			await reg.delete(NAME)
			assert.isFalse(await reg.has(NAME))
		})

		it(`.delete(name) does nothing if the value doesn't exist`, async () => {
			assert.isUndefined(await reg.delete('foobar'))
		})

		it(`.delete(subpath, name) deletes the value if it and the subkey exists`, async () => {
			const subkey = '\\Subkey'
			const NAME = 'ValueToBeDeleted'

			assert.isTrue(await reg.has(subkey, NAME))
			await reg.delete(subkey, NAME)
			assert.isFalse(await reg.has(subkey, NAME))
			assert.isTrue(await reg.has(subkey))
		})

		it(`.delete(subpath, name) does nothing if the subkey or the value doesn't exist`, async () => {
			assert.isUndefined(await reg.delete('\\Subkey', 'foobar'))
			assert.isUndefined(await reg.delete('\\foobar', 'foobar'))
		})

		it(`.delete(subpath) deletes the subkey if it exists`, async () => {
			const subkey = '\\KeyToBeDeleted-1'
			assert.isTrue(await reg.has(subkey))
			await reg.delete(subkey)
			assert.isFalse(await reg.has(subkey))
		})

		it(`.delete(subpath) does nothing if the subkey doesn't exist`, async () => {
			assert.isUndefined(await reg.delete('\\foobar'))
		})

		it(`.delete() deletes the key if it exists`, async () => {
			const path = `${PATH}\\KeyToBeDeleted-2`
			var subreg = new Registry(path)

			assert.isTrue(await Registry.has(path))
			await subreg.delete()
			assert.isFalse(await Registry.has(path))
		})

		it(`.delete() does nothing if the key doesn't exist`, async () => {
			const path = `${PATH}\\KeyToBeDeleted-3`
			var subreg = new Registry(path)

			assert.isTrue(await Registry.has(path))
			await subreg.delete()
			assert.isUndefined(await subreg.delete())
		})

	})

	describe('Options', () => {

		const PATH = `${PATH_ROOT}\\.get() and .has()`
	
		it('lowercase', async () => {
			var regNoLowercase = new Registry(PATH, {lowercase: false})
			var content = await regNoLowercase.get()
			assert.property(content, 'EmptySubkey')
		})
	
		it('lowercase can be overriden', async () => {
			var regNoLowercase = new Registry(PATH, {lowercase: false})
			var content = await regNoLowercase.get({lowercase: true})
			assert.property(content, 'emptysubkey')
		})

		it('format', async () => {
			var regComplex = new Registry(PATH, {format: 'complex'})
			var content = await regComplex.get()
			assert.isObject(content)
			assert.property(content, 'keys')
			assert.property(content.keys, 'emptysubkey')
		})

		it('format can be overriden', async () => {
			var regComplex = new Registry(PATH, {format: 'complex'})
			var content = await regComplex.get({format: 'simple'})
			assert.isObject(content)
			assert.property(content, '$values')
			assert.property(content, 'emptysubkey')
		})

		it('bits', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			var reg64 = new Registry(PATH, {bits: 64})
			var reg32 = new Registry(PATH, {bits: 32})

			assert.isTrue(await reg64.has('Bits64'))
			assert.isTrue(await reg32.has('Bits32'))
		})

		it('bits can be overriden', async () => {
			assert.isOk(isNode64bit, isNode64bitMsg)

			var reg64 = new Registry(PATH, {bits: 64})
			var reg32 = new Registry(PATH, {bits: 32})

			assert.isTrue(await reg64.has('Bits32', {bits: 32}))
			assert.isTrue(await reg32.has('Bits64', {bits: 64}))
		})
	
		it('path can be set as one of options', async () => {
			var regLowercase = new Registry({path: PATH})
			var content = await regLowercase.get()
			assert.property(content, 'emptysubkey')
		})

		it('path can be omitted', async () => {
			var regNoLowercase = new Registry({lowercase: false})
			var content = await regNoLowercase.get(PATH)
			assert.property(content, 'EmptySubkey')
		})
	
	})

})



describe('[service] Clean up registry', () => {

	const PATH           = 'HKLM\\SOFTWARE\\MikeKovarik'
	const PATH_32BIT     = 'HKLM\\SOFTWARE\\Wow6432Node\\MikeKovarik'

	it('delete test keys', async () => {
		await spawn('reg.exe', ['delete', PATH, '/f'])
		await spawn('reg.exe', ['delete', PATH_32BIT, '/f'])
	})
	
	it('test keys are deleted', async () => {
		var {stderr} = await spawn('reg.exe', ['query', PATH])
		assert.isNotEmpty(stderr)
		var {stderr} = await spawn('reg.exe', ['query', PATH_32BIT])
		assert.isNotEmpty(stderr)
	})
	
})