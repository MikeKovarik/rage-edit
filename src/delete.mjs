import {execute, getOptions, debug} from './util.mjs'
import {Registry} from './Registry.mjs'


Registry.prototype.delete = function(...args) {
	return Registry.delete(this._formatArgs(args))
}

Registry.prototype.clear = function(...args) {
	return Registry.clear(this._formatArgs(args))
}


// Deletes the registry key and all of its subkeys and values.
Registry.delete = function(...args) {
	debug('[delete.delete]', args)
	var options = getOptions(args)
	if (options.name !== undefined)
		return Registry.deleteValue(options)
	else
		return Registry.deleteKey(options)
}

// Deletes all values and subkeys of a key at given path and preserves the key itself.
Registry.clear = async function(...args) {
	debug('[delete.clear]', args)
	var options = getOptions(args)
	await Promise.all([
		Registry.clearValues(options),
		Registry.clearKeys(options)
	])
}


// Deletes the registry key and all of its subkeys and values
Registry.deleteKey = async function({path, bitsArg}) {
	debug('[delete.deleteKey]', {path, bitsArg})
	var execArgs = ['delete', path, '/f']
	if (bitsArg)
		execArgs.push(bitsArg)
	// Note: Not returning, the output of the reg command saying 'operation completed successfully'.
	//       Only await the process to finish. If any error occurs, the thrown error will bubble up.
	await execute(execArgs)
}


// Deletes single value entry inside the key (or default value if no name given).
Registry.deleteValue = async function({path, name, bitsArg}) {
	debug('[delete.deleteValue]', {path, name, bitsArg})
	var execArgs
	if (name === undefined) {
		name = Registry.DEFAULT
	}
	if (name === Registry.DEFAULT)
		execArgs = ['delete', path, '/ve', '/f']
	else
		execArgs = ['delete', path, '/v', name, '/f']
	if (bitsArg)
		execArgs.push(bitsArg)
	// Note: Not returning, the output of the reg command saying 'operation completed successfully'.
	//       Only await the process to finish. If any error occurs, the thrown error will bubble up.
	await execute(execArgs)
}



// Deletes all values inside the key. Preserves the key iteself and its subkeys.
Registry.clearValues = async function({path, bitsArg}) {
	debug('[delete.clearValues]', {path, bitsArg})
	var execArgs = ['delete', path, '/va', '/f']
	if (bitsArg)
		execArgs.push(bitsArg)
	// Note: Not returning, the output of the reg command saying 'operation completed successfully'.
	//       Only await the process to finish. If any error occurs, the thrown error will bubble up.
	await execute(execArgs)
}


// Deletes all subkeys inside the key. Preserves the key's values.
Registry.clearKeys = async function(options) {
	debug('[delete.clearKeys]', options)
	// Get list of keys and delete them one by one
	var keys = await Registry.getKeys(options)
	var promises = keys.map(key => Registry.delete(`${options.path}\\${key}`, options.bitsArg))
	await Promise.all(promises)
}
