import {HIVES, shortenHive, extendHive} from './constants.mjs'
import {sanitizePath, spawn, getOptions} from './util.mjs'
import { debug } from './util.mjs';


// Collection of static methods for interacting with any key in windows registry.
// Also a constructor of an object with access to given single registry key.
export class Registry {

	constructor(path, options) {
		debug('[new Registry()] -->', {path, options})
		path = sanitizePath(path)
		if (path.endsWith('\\'))
			path = path.slice(-1)
		this.path = path
		var hive = path.split('\\').shift()
		this.hive = shortenHive(hive)
		if (!HIVES.includes(this.hive))
			throw new Error(`Invalid hive '${this.hive}', use one of the following: ${HIVES.join(', ')}`)
		this.hiveLong = extendHive(hive)
		this.options = getOptions([options])
		debug('[new Registry()] <--', this)
	}

	_formatArgs(args) {
		var options = Object.assign({}, this.options, {[Registry.IS_OPTIONS]: true})
		if (args.length === 0)
			return [this.path, options]
		var firstArg = sanitizePath(args[0])
		if (firstArg.startsWith('.\\'))
			args[0] = this.path + firstArg.slice(1)
		else if (firstArg.startsWith('\\'))
			args[0] = this.path + firstArg
		else
			args.unshift(this.path)
		args.push(options)
		return args
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

Registry.FORMAT_SIMPLE = 'simple'
Registry.FORMAT_COMPLEX = 'complex'