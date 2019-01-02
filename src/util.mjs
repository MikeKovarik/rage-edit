import {Registry} from './Registry.mjs'
import cp from 'child_process'
import {SZ, MULTI_SZ, EXPAND_SZ, DWORD, QWORD, BINARY, NONE} from './constants.mjs'


let ERR_NOT_FOUND
export let VALUE_DEFAULT = undefined
export let VALUE_NOT_SET = undefined

let errMessagePromise
let defaultValuesPromise

function getErrorLine(stderr) {
	return stderr.trim().split('\r\n')[0]
}

function setDefaultValues(stdout) {
	// indexOf() because it's fastest.
	let iNextStr = stdout.indexOf('\r\n', 1)
	let iNameBracketOpen  = stdout.indexOf('(', iNextStr)
	let iNameBracketClose = stdout.indexOf(')', iNameBracketOpen)
	let iValBracketOpen   = stdout.indexOf('(', iNameBracketClose)
	let iValBracketClose  = stdout.indexOf(')', iValBracketOpen)
	VALUE_DEFAULT         = stdout.slice(iNameBracketOpen, iNameBracketClose+1)
	VALUE_NOT_SET         = stdout.slice(iValBracketOpen, iValBracketClose+1)
}

// Method for calling the reg.exe commands.
export var execute

// Temporary wrapper over execute() function that first gets localized values
// because reg.exe is locale based. Only runs on the first (few) calls.
execute = async args => {
	// Ensure we get localized messages only once.

	// ERR_NOT_FOUND message.
	if (!errMessagePromise) {
		errMessagePromise = spawn('reg.exe', ['QUERY', 'HKLM\\NONEXISTENT'])
			.then(res => ERR_NOT_FOUND = getErrorLine(res.stderr))
	}

	// (Default) and (value not set) values.
	if (!defaultValuesPromise) {
		defaultValuesPromise = spawn('reg.exe', ['QUERY', 'HKCR', '/ve'])
			.then(res => setDefaultValues(res.stdout))
	}

	// Postpone all execute() calls until the localized messages are resolved. 
	await Promise.all([errMessagePromise, defaultValuesPromise])

	// Replace this temporary function with actual execute().
	execute = _execute

	return _execute(args)
}

// Actual execute() function.
var _execute = async args => {
	var {stdout, stderr} = await spawn('reg.exe', args)
	// REG command has finished running, resolve result or throw error if any occured.
	if (stderr.length === 0) return stdout
	var line = getErrorLine(stderr)
	// Return undefined if the key path does not exist.
	if (line === ERR_NOT_FOUND) return undefined
	// Propagate the error forward.
	throw new RegError(`${line.slice(7)} - Command 'reg ${args.join(' ')}'`)
}

function promiseOnce(eventEmitter, event) {
	return new Promise(resolve => eventEmitter.once(event, resolve))
}

// Promise wrapper for child_process.spawn().
export var spawn = async (program, args) => {
	var proc = cp.spawn(program, args)

	var stdout = ''
	var stderr = ''
	proc.stdin.end()
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

// Replaces default spawn('reg.exe', ) with custom means of spawning reg.exe.
// For example allows to run the library in restricted environments.
// Default spawn('reg.exe', ) uses Node's child_process.spawn().
export function _replaceSpawn(externalHook) {
	spawn = externalHook
}

class RegError extends Error {
	constructor(message) {
		super(message)
		delete this.stack
	}
}

export function inferAndStringifyData(data, type) {
	if (data === undefined || data === null)
		return [data, type]
	switch (data.constructor) {
		// Convert Buffer data into string and infer type to REG_BINARY if none was specified.
		case Uint8Array:
			data = data.buffer
		case ArrayBuffer:
			data = Buffer.from(data)
		case Buffer:
			if (type === undefined)
				type = BINARY
			// Convert to ones and zeroes if the type is REG_BINARY or fall back to utf8.
			data = data.toString(type === BINARY ? 'hex' : 'utf8')
			break
		case Array:
			// Set REG_MULTI_SZ type if none is specified.
			if (type === undefined)
				type = MULTI_SZ
			// REG_MULTI_SZ contains a string with '\0' separated substrings.
			data = data.join('\\0')
			break
		case Number:
			// Set REG_DWORD type if none is specified.
			if (type === undefined)
				type = DWORD
			break
		case String:
		//default:
			// Set REG_SZ type if none is specified.
			switch (type) {
				case BINARY:
					data = Buffer.from(data, 'utf8').toString('hex')
					break
				case MULTI_SZ:
					data = data.replace(/\0/g, '\\0')
					break
				case undefined:
					type = SZ
					break
			}
	}
	return [data, type]
}

export function parseValueData(data, type) {
	if (type === BINARY)
		data = Buffer.from(data, 'hex')
	if (type === DWORD)
		data = parseInt(data)
	//if (type === QWORD && convertQword)
	//	data = parseInt(data)
	if (type === MULTI_SZ)
		data = data.split('\\0')
	return [data, type]
}

// Transforms possible forwardslashes to Windows style backslash
export function sanitizePath(path) {
	path = path.trim()
	if (path.includes('/'))
		return path.replace(/\//g, '\\')
	else
		return path
}

// Uppercases and prepends 'REG_' to a type string if needed.
export function sanitizeType(type) {
	// Skip transforming if the type is undefined
	if (type === undefined)
		return
	type = type.toUpperCase()
	// Prepend REG_ if it's missing
	if (!type.startsWith('REG_'))
		type = 'REG_' + type
	return type
}

export function getOptions(userOptions) {
	var {lowercase, format} = Registry
	var defaultOptions = {lowercase, format}
	if (userOptions)
		return Object.assign(defaultOptions, userOptions)
	else
		return defaultOptions
}
