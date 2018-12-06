import {execute, sanitizePath, getOptions, inferAndStringifyData, sanitizeType, modeToArg} from './util.mjs'
import {TYPES} from './constants.mjs'
import {Registry} from './Registry.mjs'


// Just like static .set() but first argument 'path' can be omitted,
// or used a relative path starting with '//' like '//supath'
Registry.prototype.set = function(...args) {
	return Registry.set(...this._formatArgs(args))
}


// Creates or overwrites value entry at given inside a key.
Registry.set = function(path, arg2, ...args) {
	// Nothing but path is passed
	if (arg2 === undefined)
		return Registry.setKey(path)
	// If second argument is null or false, pass the third one to 'setKey'
	//   (it's probably an options object)
	else if (arg2 === false || arg2 === null)
		return Registry.setKey(path, args[0])
	else
		return Registry.setValue(path, arg2, ...args)
}


// Creates a key at given path.  Does nothing if the key already exists.
Registry.setKey = async function(path, options) {
	// Allow both forwardslashes and backslashes
	path = sanitizePath(path)
	// Populate options with default values
	options = getOptions(options)
	// Note: Not returning, the output of the reg command saying 'operation completed successfully'.
	//       Only await the process to finish. If any error occurs, the thrown error will bubble up.
	await execute(['add', path, '/f', modeToArg(options.mode)])
}


// Creates or overwrites value entry at given inside a key.
Registry.setValue = async function(path, name, data, type, options) {
	// Allow both forwardslashes and backslashes
	path = sanitizePath(path)
	// 'name' argument can only be string, otherwise it's and object of values and possible nested subkeys.
	if (typeof name !== 'string') {
		data = name
		name = undefined
	}
	// 'type' argument can only be string, otherwise it's a settings object.
	if (typeof type !== 'string') {
		options = type
		type = undefined
	}
	// Populate options with default values
	options = getOptions(options)
	// Arguments: path, name[, data[, type][, options]]]
	return _setValue(path, name, data, type, options)
}
async function _setValue(path, name, data = '', type, options) {
	if (isObject(data)) {
		if (name)
			path += `\\${name}`
		var promises = Object.keys(data)
			.map(name => _setValue(path, name, data[name], undefined, options))
		return Promise.all(promises)
	}
	// Uppercase and make sure the type starts with REG_
	type = sanitizeType(type)
	// Prepare the data to be put into string cli command.
	var [data, type] = inferAndStringifyData(data, type)
	// Throw if the type is incorrect
	if (!TYPES.includes(type))
		throw Error(`Illegal type '${type}', should be one of: '${TYPES.join('\', \'')}'`)
	var args = ['add', path]
	// Create or overwrite the default or named value entry.
	if (name === Registry.DEFAULT)
		args.push('/ve')
	else
		args.push('/v', name)
	// Type should always be defined.
	if (type !== undefined)
		args.push('/t', type)
	// Data might not be defined.
	if (data !== undefined)
		args.push('/d', data)
	// Forces potential overwrite without prompting.
	args.push('/f')
	// Set mode (32bit or 64 bit) if needed
	args.push(modeToArg(options.mode))
	// Note: Not returning, the output of the reg command saying 'operation completed successfully'.
	//       Only await the process to finish. If any error occurs, the thrown error will bubble up.
	await execute(args)
}


function isArrayLike(something) {
	if (something === undefined)
		 return false
	return Array.isArray(something)
		|| Buffer.isBuffer(something)
		|| something.constructor === Uint8Array
		//|| something.constructor === ArrayBuffer
}

function isObject(something) {
	return typeof something === 'object' && !isArrayLike(something)
}