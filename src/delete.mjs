import {execute, sanitizePath, getOptions, modeToArg} from './util.mjs'
import {Registry} from './Registry.mjs'


Registry.prototype.delete = function(...args) {
	return Registry.delete(...this._formatArgs(args))
}

Registry.prototype.clear = function(...args) {
	return Registry.clear(...this._formatArgs(args))
}


// Deletes the registry key and all of its subkeys and values.
Registry.delete = function(path, arg2, options) {
	var type = typeof arg2
	if (type === 'undefined')
		return Registry.deleteKey(path)
	else if (type === 'object')
		return Registry.deleteKey(path, arg2)
	else
		return Registry.deleteValue(path, arg2, options)
}

// Deletes all values and subkeys of a key at given path and preserves the key itself.
Registry.clear = async function(path, options) {
	await Promise.all([
		Registry.clearValues(path, options),
		Registry.clearKeys(path, options)
	])
}


// Deletes the registry key and all of its subkeys and values
Registry.deleteKey = async function(path, options) {
	// Allows both forwardslashes and backslashes
	path = sanitizePath(path)
	// Populate options with default values
	options = getOptions(options)
	// Note: Not returning, the output of the reg command saying 'operation completed successfully'.
	//       Only await the process to finish. If any error occurs, the thrown error will bubble up.
	await execute(['delete', path, '/f', modeToArg(options.mode)])
}


// Deletes single value entry inside the key (or default value if no name given).
Registry.deleteValue = async function(path, name, options) {
	// Check if only path and options were passed
	if (typeof name === 'object') {
		options = name
		name = Registry.DEFAULT
	} else if (typeof name === 'undefined') {
		name = Registry.DEFAULT
	}
	// Allows both forwardslashes and backslashes
	path = sanitizePath(path)
	// Populate options with default values
	options = getOptions(options)
	if (name === Registry.DEFAULT)
		var args = ['delete', path, '/ve', '/f', modeToArg(options.mode)]
	else
		var args = ['delete', path, '/v', name, '/f', modeToArg(options.mode)]
	// Note: Not returning, the output of the reg command saying 'operation completed successfully'.
	//       Only await the process to finish. If any error occurs, the thrown error will bubble up.
	await execute(args)
}



// Deletes all values inside the key. Preserves the key iteself and its subkeys.
Registry.clearValues = async function(path, options) {
	// Allows both forwardslashes and backslashes
	path = sanitizePath(path)
	// Populate options with default values
	options = getOptions(options)
	// Note: Not returning, the output of the reg command saying 'operation completed successfully'.
	//       Only await the process to finish. If any error occurs, the thrown error will bubble up.
	await execute(['delete', path, '/va', '/f', modeToArg(options.mode)])
}


// Deletes all subkeys inside the key. Preserves the key's values.
Registry.clearKeys = async function(path, options) {
	// Allows both forwardslashes and backslashes
	path = sanitizePath(path)
	// Get list of keys and delete them one by one
	var keys = await Registry.getKeys(path, options)
	var promises = keys.map(key => Registry.delete(`${path}\\${key}`, options))
	await Promise.all(promises)
}
