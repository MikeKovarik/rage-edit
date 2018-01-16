import {execute, sanitizePath} from './util.mjs'
import {Registry} from './Registry.mjs'


Registry.prototype.delete = function(...args) {
	return Registry.delete(...this._formatArgs(args))
}

Registry.prototype.clear = function(...args) {
	return Registry.clear(...this._formatArgs(args))
}


// Deletes the registry key and all of its subkeys and values.
Registry.delete = function(path, name) {
	if (name === undefined)
		return Registry.deleteKey(path)
	else
		return Registry.deleteValue(path, name)
}

// Deletes all values and subkeys of a key at given path and preserves the key itself.
Registry.clear = async function(path) {
	await Promise.all([
		Registry.clearValues(path),
		Registry.clearKeys(path)
	])
}


// Deletes the registry key and all of its subkeys and values
Registry.deleteKey = async function(path) {
	// Allows both forwardslashes and backslashes
	path = sanitizePath(path)
	// Note: Not returning, the output of the reg command saying 'operation completed successfully'.
	//       Only await the process to finish. If any error occurs, the thrown error will bubble up.
	await execute(['delete', path, '/f'])
}


// Deletes single value entry inside the key (or default value if no name given).
Registry.deleteValue = async function(path, name = Registry.DEFAULT) {
	// Allows both forwardslashes and backslashes
	path = sanitizePath(path)
	if (name === Registry.DEFAULT)
		var args = ['delete', path, '/ve', '/f']
	else
		var args = ['delete', path, '/v', name, '/f']
	// Note: Not returning, the output of the reg command saying 'operation completed successfully'.
	//       Only await the process to finish. If any error occurs, the thrown error will bubble up.
	await execute(args)
}



// Deletes all values inside the key. Preserves the key iteself and its subkeys.
Registry.clearValues = async function(path) {
	// Allows both forwardslashes and backslashes
	path = sanitizePath(path)
	// Note: Not returning, the output of the reg command saying 'operation completed successfully'.
	//       Only await the process to finish. If any error occurs, the thrown error will bubble up.
	await execute(['delete', path, '/va', '/f'])
}


// Deletes all subkeys inside the key. Preserves the key's values.
Registry.clearKeys = async function(path) {
	// Allows both forwardslashes and backslashes
	path = sanitizePath(path)
	// Get list of keys and delete them one by one
	var keys = await Registry.getKeys(path)
	var promises = keys.map(key => Registry.delete(`${path}\\${key}`))
	await Promise.all(promises)
}
