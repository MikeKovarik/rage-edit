import {execute, getOptions, inferAndStringifyData, sanitizeType, isObject, debug} from './util.mjs'
import {TYPES} from './constants.mjs'
import {Registry} from './Registry.mjs'


// Just like static .set() but first argument 'path' can be omitted,
// or used a relative path starting with '//' like '//supath'
Registry.prototype.set = function(...args) {
	return Registry.set(this._formatArgs(args))
}


// Creates or overwrites value entry at given inside a key.
Registry.set = async function(...args) {
	debug('[set.set]', args)
	// Workaround that allows to use last argument as a data object, not options object
	//   by appending an empty object to the args list.
	// To specify last object as an options object, '$isOptions: true' should be added:
	//   Registry.set(path, 'Value name', {bits: 32, $isOptions: true})
	var lastArg = args[args.length - 1]
	if ((args.length === 2 || args.length === 3)
		&& isObject(lastArg)
		&& !lastArg[Registry.IS_OPTIONS]
	) {
		args.push({})
	}
	var options = getOptions(args)
	if (options.name !== undefined)
		return Registry.setValue(options)
	else
		return Registry.setKey(options)
}


// Creates a key at given path.  Does nothing if the key already exists.
Registry.setKey = async function({path, bitsArg}) {
	debug('[set.setKey]', {path, bitsArg})
	var addArgs = ['add', path, '/f']
	var delArgs = ['delete', path, '/ve', '/f']
	if (bitsArg) {
		addArgs.push(bitsArg)
		delArgs.push(bitsArg)
	}
	// Note: Not returning, the output of the reg command saying 'operation completed successfully'.
	//       Only await the process to finish. If any error occurs, the thrown error will bubble up.
	await execute(addArgs)
	// 'reg.exe add' always creates/overrides '(default)' item with empty string (not undefined value). This command makes '(default)' undefined.
	await execute(delArgs)
}


// Creates or overwrites value entry at given inside a key.
Registry.setValue = async function({path, name, data = '', type, bitsArg}) {
	debug('[set.setValue]', {path, name, data, type, bitsArg})
	// 'name' argument can only be string, otherwise it's and object of values and possible nested subkeys.
	if (typeof name !== 'string') {
		data = name
		name = undefined
	}
	if (isObject(data)) {
		if (name)
			path += `\\${name}`
		var promises = Object.keys(data)
			.map(name => Registry.setValue({path, name, data: data[name], bitsArg}))
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
	// Set 32bit/64bit mode if needed
	if (bitsArg)
	  args.push(bitsArg)
	// Note: Not returning, the output of the reg command saying 'operation completed successfully'.
	//       Only await the process to finish. If any error occurs, the thrown error will bubble up.
	await execute(args)
}