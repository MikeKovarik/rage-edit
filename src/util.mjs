import {Registry} from './Registry.mjs'
import {spawn} from 'child_process'
import {SZ, MULTI_SZ, EXPAND_SZ, DWORD, QWORD, BINARY, NONE} from './constants.mjs'


const ERR_MSG_NOT_FOUND = 'ERROR: The system was unable to find the specified registry key or value.'

const stdio = ['ignore', 'pipe', 'pipe']

export function execute(args) {

	return new Promise((resolve, reject) => {

		var proc = spawn('reg', args, {stdio})

		var output = ''
		var error = ''
		proc.stdout.on('data', data => output += data.toString())
		proc.stderr.on('data', data => error  += data.toString())

		proc.on('close', code => {
			// REG command has finished running, resolve result or throw error if any occured.
			if (error.length) {
				var line = error.trim().split('\r\n')[0]
				// Return undefined if the key path does not exist. Or propagate the error forward.
				if (line === ERR_MSG_NOT_FOUND) {
					resolve(undefined)
				} else {
					var message = `${line.slice(7)} - Command 'reg ${args.join(' ')}'`
					var err = new Error(message)
					err.stack = undefined
					reject(err)
				}
			} else {
				resolve(output)
			}
			proc.removeAllListeners()
		})

		//proc.on('error', err => {
		//	console.error('process error', err)
		//	reject(err)
		//	proc.removeAllListeners()
		//})

	})

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