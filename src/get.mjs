import {execute, sanitizePath, getOptions, parseValueData} from './util.mjs'
import {extendKeyPath} from './constants.mjs'
import {Registry} from './Registry.mjs'


Registry.prototype.get = function(...args) {
	return Registry.get(...this._formatArgs(args))
}


Registry.prototype.has = async function(...args) {
	return Registry.has(...this._formatArgs(args))
}


Registry.get = function(path, arg2, options) {
	var type = typeof arg2
	if (type === 'boolean')
		return Registry.getKey(path, arg2, options)
	else if (type === 'object')
		return Registry.getKey(path, undefined, arg2)
	else if (type === 'undefined')
		return Registry.getKey(path)
	else
		return Registry.getValue(path, arg2, options)
}


Registry.has = function(path, name) {
	if (name === undefined)
		return Registry.hasKey(path)
	else
		return Registry.hasValue(path, name)
}


Registry.getKey = async function(path, recursive, options) {
	// Allow both forwardslashes and backslashes
	path = sanitizePath(path)
	// [recursive] is optional
	if (typeof recursive === 'object') {
		options = recursive
		recursive = false
	}
	options = getOptions(options)
	if (recursive)
		var result = await execute(['query', path, '/s'])
	else
		var result = await execute(['query', path])
	// Short circuit further processing if the key at given path was not found and undefined was returned.
	if (result === undefined) return
	// Slight preprocessing of the returned result
	var lines = result.split('\r\n')
	// reg can take shorter paths, but returns strictily long paths
	// convert the query path to full path.
	var fullPath = extendKeyPath(path)
	var trimBy = fullPath.length + 1
	// The first line might not be equal to path, but 
	var lastPath = fullPath
	var root = createKeyStructure(options.format)
	var scope = root

	for (var i = 1; i < lines.length; i++) {
		let line = lines[i]
		switch (line[0]) {
			case ' ':
				let entry = processValueLine(line, options)
				assignValueEntry(scope, entry, options.format)
				break
			case 'H':
				// Line starts with H, as for HK hive name, process it as subkey path.
				// WARNING: Do not trim. Keys in path can contain and end with a space character.
				var subPath = line.slice(trimBy)
				if (subPath === '')
					continue
				if (options.lowercase)
					subPath = subPath.toLowerCase()
				scope = traverseKeyPath(root, subPath, recursive, options.format)
				break
		}
	}

	return root
}


// returns single value
// Warning: 'reg' command is case insensitive and value names in the results are as well.
Registry.getValue = async function(path, name = Registry.DEFAULT, options) {
	// Allow both forwardslashes and backslashes
	path = sanitizePath(path)
	options = getOptions(options)
	// Create query for retrieving only single value entry. Either the default one (empty string) or concrete named.
	if (name === Registry.DEFAULT)
		var result = await execute(['query', path, '/ve'])
	else
		var result = await execute(['query', path, '/v', name])
	// Short circuit further processing if the key at given path was not found and undefined was returned.
	if (result === undefined) return

	// Split result by lines and find the one starting with space - that's the one with value.
	var line = result
		.split('\r\n')
		.find(line => line[0] === ' ')
	// Parse the lino into entry object and return it (or only the data if simple result is requested).
	var entry = processValueLine(line, options)
	if (options.format === Registry.FORMAT_SIMPLE)
		return entry.data
	else
		return entry
}


// Returns an array of subkeys (or their full paths).
Registry.getKeys = async function(path, options) {
	// Allow both forwardslashes and backslashes
	path = sanitizePath(path)
	options = getOptions(options)
	// Create simple query at given path
	var result = await execute(['query', path])
	// Short circuit further processing if the key at given path was not found and undefined was returned.
	if (result === undefined) return
	// REG can take shorter paths, but returns strictily long paths.
	// Convert the query path to full path.
	var fullPath = extendKeyPath(path)
	// Each line that starts with HK is a path of a subkey (or self).
	var keyPaths = result
		.split('\r\n')
		.filter(line => line.startsWith('HK'))
		.filter(line => line !== fullPath)
	// simple format trims whole HK.. path and only returns subkeys (the name after last slash).
	if (options.format === Registry.FORMAT_SIMPLE) {
		let trimBy = fullPath.length + 1
		keyPaths = keyPaths.map(path => path.slice(trimBy))
	}
	// Paths and names in registry are case insensity, we can lowercase at this point without loosing any details.
	if (options.lowercase)
		keyPaths = keyPaths.map(path => path.toLowerCase())
	// return processed paths or subkey names.
	return keyPaths
}


Registry.getValues = async function(path, options) {
	// Allow both forwardslashes and backslashes
	path = sanitizePath(path)
	options = getOptions(options)
	// Create simple query at given path
	var result = await execute(['query', path])
	// Short circuit further processing if the key at given path was not found and undefined was returned.
	if (result === undefined) return
	// Split result by lines and only keep the ones starting with space - only those contain value entry.
	var entries = result
		.split('\r\n')
		.filter(line => line[0] === ' ')
		.map(line => processValueLine(line, options))
	// Output in simple or complex format.
	if (options.format === Registry.FORMAT_SIMPLE) {
		var outObject = {}
		entries.forEach(entry => outObject[entry.name] = entry.data)
		return outObject
	} else {
		return entries
	}
}


// Returns true if a key at the path exists
Registry.hasKey = function(path) {
	// Allow both forwardslashes and backslashes
	path = sanitizePath(path)
	// Create query for retrieving only single value entry. Either the default one (empty string) or concrete named.
	// 'false' argument disables suppression of not found errors for simpler handling (with catch statement).
	return execute(['query', path])
		.then(result => result === undefined ? false : true)
}


// Returns true if a value at the path exists
Registry.hasValue = async function(path, name = Registry.DEFAULT) {
	// Allow both forwardslashes and backslashes
	path = sanitizePath(path)
	// Create query for retrieving only single value entry. Either the default one (empty string) or concrete named.
	// 'false' argument disables suppression of not found errors for simpler handling (with catch statement).
	if (name === Registry.DEFAULT)
		var result = await execute(['query', path, '/ve'])
	else
		var result = await execute(['query', path, '/v', name])
	if (result === undefined) return false
	// Default value name is represented by a word default in brackets.
	if (name === Registry.DEFAULT)
		name = Registry.DEFAULT_VERBOSE
	// Split the result into lines and try to find the searched one.
	// NOTE: not needed to lowercase the result, REG always returns queried value name in the same caps.
	return result
		.split('\r\n')
		.some(line => line.startsWith(`    ${name}`))
}


function traverseKeyPath(root, path, recursive, format, ensureExists = true) {
	var sections = path.split('\\')

	if (format === Registry.FORMAT_SIMPLE) {

		var current = root
		while (sections.length) {
			let section = sections.shift()
			if (current[section] !== undefined && current[section] !== null)
				current = current[section]
			else if (ensureExists)
				current = current[section] = createKeyStructure(format, recursive)
			else
				return
		}

	} else {

		var current = root
		while (sections.length) {
			let section = sections.shift()
			if (current.keys[section] !== undefined && current.keys[section] !== null) {
				current = current.keys[section]
			} else if (ensureExists) {
				let newDescriptor = createKeyStructure(format, recursive)
				current.keys[section] = newDescriptor
				current = newDescriptor
			} else {
				return
			}
		}

	}

	return current
}


function createKeyStructure(format, recursive) {
	if (format === Registry.FORMAT_SIMPLE) {
		// '$values' (or custom defined) is an object among other subkeys.
		// value entries are stored as name-value pairs and information about type is dropped.
		// collision can occur if key has subkey of the same name ('$values' or custom defined).
		return {
			[Registry.VALUES]: {
				//[Registry.DEFAULT]: undefined
			}
		}
	} else {
		// 'keys' is an object that will keep nesting structure of the same shape.
		// 'values' is an array of objects descibing value entries as {name, type, data}
		return {
			keys: {},
			values: [
				//{
				//	name: Registry.DEFAULT,
				//	type: 'REG_SZ',
				//	data: undefined
				//}
			],
		}
	}
}


function assignValueEntry(scope, entry, format) {
	if (format === Registry.FORMAT_SIMPLE) {
		scope[Registry.VALUES][entry.name] = entry.data
	} else {
		//if (entry.name === Registry.DEFAULT)
		//	scope.values = scope.values.filter(entry => entry.name !== Registry.DEFAULT)
		scope.values.push(entry)
	}
}


function processValueLine(line, options) {
	// value line starts with 4 spaces and consists of three items that are also spaces by 4 spaces.
	// WARNING: Do not trim. Lines only start with 4 spaces, they don't end with 4 spaces unsless the value is empty string.
	var [name, type, data] = line.slice(4).split('    ')
	if (name === '(Default)')
		name = Registry.DEFAULT
	if (data === '(value not set)')
		data = undefined
	else if (options.lowercase)
		name = name.toLowerCase()
	// Convert REG_BINARY value into buffer
	var [data, type] = parseValueData(data, type)
	return {name, type, data}
}
