import {HIVES, shortenHive, extendHive} from './constants.mjs'
import {sanitizePath} from './util.mjs'


// Collection of static methods for interacting with any key in windows registry.
// Also a constructor of an object with access to given single registry key.
export class Registry {

	constructor(path, options) {
		path = sanitizePath(path)
		if (path.endsWith('\\'))
			path = path.slice(-1)
		this.path = path
		var hive = path.split('\\').shift()
		this.hive = shortenHive(hive)
		if (!HIVES.includes(this.hive))
			throw new Error(`Invalid hive '${this.hive}', use one of the following: ${HIVES.join(', ')}`)
		this.hiveLong = extendHive(hive)
		this.options = Object.assign({}, Registry.options, options)
	}

	_formatArgs(args) {
		if (args.length === 0)
			return [this.path]
		// TODO: simplified, lowercase
		var firstArg = sanitizePath(args[0])
		if (firstArg.startsWith('.\\'))
			args[0] = this.path + firstArg.slice(1)
		else if (firstArg.startsWith('\\'))
			args[0] = this.path + firstArg
		else
			args.unshift(this.path)
		return args
	}

}

Registry.VALUES = '$values'
Registry.DEFAULT = ''
Registry.DEFAULT_VERBOSE = '(Default)'

// Only names and paths are affected, not the data
Registry.lowercase = true
// Calls return simplified output format by default.
// Can be 'simple', 'complex', (TODO) 'naive'
Registry.format = 'simple'

Registry.FORMAT_NAIVE = 'naive'
Registry.FORMAT_SIMPLE = 'simple'
Registry.FORMAT_COMPLEX = 'complex'