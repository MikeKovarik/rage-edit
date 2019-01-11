import {HIVES, shortenHive, extendHive} from './constants.mjs'
import {sanitizePath, spawn, getOptions} from './util.mjs'
import {debug} from './util.mjs'


// Collection of static methods for interacting with any key in windows registry.
// Also a constructor of an object with access to given single registry key.
export class Registry {

	constructor(...args) {
		debug('[new Registry()] -->', args)
		var options = getOptions(args)

		// Path is optional
		if (options.path) {
			if (options.path.endsWith('\\'))
				options.path = options.path.slice(-1)
			this.path = options.path

			var hive = options.path.split('\\').shift()
			this.hive = shortenHive(hive)
			if (!HIVES.includes(this.hive))
				throw new Error(`Invalid hive '${this.hive}', use one of the following: ${HIVES.join(', ')}`)
			this.hiveLong = extendHive(hive)
		}

		this.options = options
		debug('[new Registry()] <--', this)
	}

	_formatArgs(args) {
		debug('[Registry._formatArgs] -->', args)
		var options = {...this.options, [Registry.IS_OPTIONS]: true}
		if (args.length === 0) {
			options.path = this.path
			debug('[Registry._formatArgs] <--', options)
			return options
		}

		// Path is optional
		if (this.path) {
			if (typeof args[0] == 'string') {
				args[0] = sanitizePath(args[0])

				if (args[0].startsWith('.\\'))
					args[0] = this.path + args[0].slice(1)
				else if (args[0].startsWith('\\'))
					args[0] = this.path + args[0]
				else
					args = [this.path, ...args]
			}
		}

		// 'false' is for not including default values (such as 'lowercase') from 'Registry'
		var userOptions = getOptions(args, false)
		options = {...options, ...userOptions}

		debug('[Registry._formatArgs] <--', options)
		return options
	}

	static async getCodePage() {
		var {stdout} = await spawn('cmd.exe', ['/c', 'chcp.com'])
		var cp = Number(stdout.split(':')[1])
		if (Number.isNaN(cp)) throw new Error(`Can't get current code page`)
		return cp
	}

	static async setCodePage(encoding) {
		try {
			await spawn('cmd.exe', ['/c', 'chcp.com', encoding])
		} catch (e) {
			throw new Error(`Invalid code page: ${encoding}`)
		}
	}

	static async enableUnicode() {
		if (this.lastCodePage) return false
		this.lastCodePage = await this.getCodePage()
		await this.setCodePage(65001)
		return true
	}

	static async disableUnicode() {
		if (!this.lastCodePage) return false
		await this.setCodePage(this.lastCodePage)
		this.lastCodePage = undefined
		return true
	}

}

// Needed for tests only
Registry._argsToOpts = (...args) => getOptions(args)

Registry.IS_OPTIONS = '$isOptions'
Registry.VALUES = '$values'
Registry.DEFAULT = ''

// Only names and paths are affected, not the data
Registry.lowercase = true
// Calls return simplified output format by default.
// Can be 'simple', 'complex', (TODO) 'naive'
Registry.format = 'simple'
// By default 'bits' depend on node.js version
Registry.bits = null

Registry.FORMAT_SIMPLE = 'simple'
Registry.FORMAT_COMPLEX = 'complex'