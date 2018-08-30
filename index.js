(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('child_process')) :
	typeof define === 'function' && define.amd ? define(['exports', 'child_process'], factory) :
	(factory((global['rage-edit'] = {}),global.child_process));
}(this, (function (exports,cp) { 'use strict';

	cp = cp && cp.hasOwnProperty('default') ? cp['default'] : cp;

	const SZ        = 'REG_SZ';
	const MULTI_SZ  = 'REG_MULTI_SZ';
	const EXPAND_SZ = 'REG_EXPAND_SZ';
	const DWORD     = 'REG_DWORD';
	const QWORD     = 'REG_QWORD';
	const BINARY    = 'REG_BINARY';
	const NONE      = 'REG_NONE';

	const TYPES = [SZ, MULTI_SZ, EXPAND_SZ, DWORD, QWORD, BINARY, NONE];


	const HKLM_FULL  = 'HKEY_LOCAL_MACHINE';
	const HKCU_FULL  = 'HKEY_CURRENT_USER';
	const HKCR_FULL  = 'HKEY_CLASSES_ROOT';
	const HKU_FULL   = 'HKEY_USERS';
	const HKCC_FULL  = 'HKEY_CURRENT_CONFIG';

	const HKLM  = 'HKLM';
	const HKCU  = 'HKCU';
	const HKCR  = 'HKCR';
	const HKU   = 'HKU';
	const HKCC  = 'HKCC';

	const HIVES = [HKLM, HKCU, HKCR, HKU, HKCC];


	function shortenKeyPath(path) {
		var index = path.indexOf('\\');
		var firstSection = path.slice(0, index);
		return shortenHive(firstSection) + '\\' + path.slice(index + 1)
	}
	function extendKeyPath(path) {
		var index = path.indexOf('\\');
		var firstSection = path.slice(0, index);
		return extendHive(firstSection) + '\\' + path.slice(index + 1)
	}


	function shortenHive(hive) {
		switch (hive) {
			case HKLM_FULL: return HKLM
			case HKCU_FULL: return HKCU
			case HKCR_FULL: return HKCR
			case HKU_FULL : return HKU 
			case HKCC_FULL: return HKCC
		}
		return hive
	}
	function extendHive(hive) {
		switch (hive) {
			case HKLM: return HKLM_FULL
			case HKCU: return HKCU_FULL
			case HKCR: return HKCR_FULL
			case HKU : return HKU_FULL 
			case HKCC: return HKCC_FULL
		}
		return hive
	}

	const ERR_MSG_NOT_FOUND = 'ERROR: The system was unable to find the specified registry key or value.';

	const stdio = ['ignore', 'pipe', 'pipe'];


	function promiseOnce(eventEmitter, event) {
		return new Promise(resolve => eventEmitter.once(event, resolve))
	}


	// Promise wrapper for child_process.spawn().
	var spawnProcess = async args => {
		var proc = cp.spawn('reg.exe', args, {stdio});

		var stdout = '';
		var stderr = '';
		proc.stdout.on('data', data => stdout += data.toString());
		proc.stderr.on('data', data => stderr += data.toString());

		//var code = await promiseOnce(proc, 'exit')
		var code = await promiseOnce(proc, 'close');

		proc.removeAllListeners();

		//proc.on('error', err => {
		//	console.error('process error', err)
		//	reject(err)
		//	proc.removeAllListeners()
		//})

		return {stdout, stderr, code}
	};

	// Replaces default spawnProcess() that uses Node's child_process.spawn().
	function _replaceProcessSpawner(externalHook) {
		spawnProcess = externalHook;
	}

	async function execute(args) {
		var {stdout, stderr, code} = await spawnProcess(args);

		// REG command has finished running, resolve result or throw error if any occured.
		if (stderr.length) {
			var line = stderr.trim().split('\r\n')[0];
			if (line === ERR_MSG_NOT_FOUND) {
				// Return undefined if the key path does not exist.
				return undefined
			} else {
				// Propagate the error forward.
				var message = `${line.slice(7)} - Command 'reg ${args.join(' ')}'`;
				var err = new Error(message);
				delete err.stack;
				throw err
			}
		} else {
		//} else if (code === 0) {
			return stdout
		}
	}


	function inferAndStringifyData(data, type) {
		if (data === undefined || data === null)
			return [data, type]
		switch (data.constructor) {
			// Convert Buffer data into string and infer type to REG_BINARY if none was specified.
			case Uint8Array:
				data = data.buffer;
			case ArrayBuffer:
				data = Buffer.from(data);
			case Buffer:
				if (type === undefined)
					type = BINARY;
				// Convert to ones and zeroes if the type is REG_BINARY or fall back to utf8.
				data = data.toString(type === BINARY ? 'hex' : 'utf8');
				break
			case Array:
				// Set REG_MULTI_SZ type if none is specified.
				if (type === undefined)
					type = MULTI_SZ;
				// REG_MULTI_SZ contains a string with '\0' separated substrings.
				data = data.join('\\0');
				break
			case Number:
				// Set REG_DWORD type if none is specified.
				if (type === undefined)
					type = DWORD;
				break
			case String:
			//default:
				// Set REG_SZ type if none is specified.
				switch (type) {
					case BINARY:
						data = Buffer.from(data, 'utf8').toString('hex');
						break
					case MULTI_SZ:
						data = data.replace(/\0/g, '\\0');
						break
					case undefined:
						type = SZ;
						break
				}
		}
		return [data, type]
	}

	function parseValueData(data, type) {
		if (type === BINARY)
			data = Buffer.from(data, 'hex');
		if (type === DWORD)
			data = parseInt(data);
		//if (type === QWORD && convertQword)
		//	data = parseInt(data)
		if (type === MULTI_SZ)
			data = data.split('\\0');
		return [data, type]
	}

	// Transforms possible forwardslashes to Windows style backslash
	function sanitizePath(path) {
		path = path.trim();
		if (path.includes('/'))
			return path.replace(/\//g, '\\')
		else
			return path
	}

	// Uppercases and prepends 'REG_' to a type string if needed.
	function sanitizeType(type) {
		// Skip transforming if the type is undefined
		if (type === undefined)
			return
		type = type.toUpperCase();
		// Prepend REG_ if it's missing
		if (!type.startsWith('REG_'))
			type = 'REG_' + type;
		return type
	}

	function getOptions(userOptions) {
		var {lowercase, format} = Registry;
		var defaultOptions = {lowercase, format};
		if (userOptions)
			return Object.assign(defaultOptions, userOptions)
		else
			return defaultOptions
	}

	// Collection of static methods for interacting with any key in windows registry.
	// Also a constructor of an object with access to given single registry key.
	class Registry {

		constructor(path, options) {
			path = sanitizePath(path);
			if (path.endsWith('\\'))
				path = path.slice(-1);
			this.path = path;
			var hive = path.split('\\').shift();
			this.hive = shortenHive(hive);
			if (!HIVES.includes(this.hive))
				throw new Error(`Invalid hive '${this.hive}', use one of the following: ${HIVES.join(', ')}`)
			this.hiveLong = extendHive(hive);
			this.options = Object.assign({}, Registry.options, options);
		}

		_formatArgs(args) {
			if (args.length === 0)
				return [this.path]
			// TODO: simplified, lowercase
			var firstArg = sanitizePath(args[0]);
			if (firstArg.startsWith('.\\'))
				args[0] = this.path + firstArg.slice(1);
			else if (firstArg.startsWith('\\'))
				args[0] = this.path + firstArg;
			else
				args.unshift(this.path);
			return args
		}

	}

	Registry.VALUES = '$values';
	Registry.DEFAULT = '';
	Registry.DEFAULT_VERBOSE = '(Default)';

	// Only names and paths are affected, not the data
	Registry.lowercase = true;
	// Calls return simplified output format by default.
	// Can be 'simple', 'complex', (TODO) 'naive'
	Registry.format = 'simple';

	Registry.FORMAT_NAIVE = 'naive';
	Registry.FORMAT_SIMPLE = 'simple';
	Registry.FORMAT_COMPLEX = 'complex';

	Registry.prototype.get = function(...args) {
		return Registry.get(...this._formatArgs(args))
	};


	Registry.prototype.has = async function(...args) {
		return Registry.has(...this._formatArgs(args))
	};


	Registry.get = function(path, arg2, options) {
		var type = typeof arg2;
		if (type === 'boolean')
			return Registry.getKey(path, arg2, options)
		else if (type === 'object')
			return Registry.getKey(path, undefined, arg2)
		else if (type === 'undefined')
			return Registry.getKey(path)
		else
			return Registry.getValue(path, arg2, options)
	};


	Registry.has = function(path, name) {
		if (name === undefined)
			return Registry.hasKey(path)
		else
			return Registry.hasValue(path, name)
	};


	Registry.getKey = async function(path, recursive, options) {
		// Allow both forwardslashes and backslashes
		path = sanitizePath(path);
		// [recursive] is optional
		if (typeof recursive === 'object') {
			options = recursive;
			recursive = false;
		}
		options = getOptions(options);
		if (recursive)
			var result = await execute(['query', path, '/s']);
		else
			var result = await execute(['query', path]);
		// Short circuit further processing if the key at given path was not found and undefined was returned.
		if (result === undefined) return
		// Slight preprocessing of the returned result
		var lines = result.split('\r\n');
		// reg can take shorter paths, but returns strictily long paths
		// convert the query path to full path.
		var fullPath = extendKeyPath(path);
		var trimBy = fullPath.length + 1;
		// The first line might not be equal to path, but 
		var lastPath = fullPath;
		var root = createKeyStructure(options.format);
		var scope = root;

		for (var i = 1; i < lines.length; i++) {
			let line = lines[i];
			switch (line[0]) {
				case ' ':
					let entry = processValueLine(line, options);
					assignValueEntry(scope, entry, options.format);
					break
				case 'H':
					// Line starts with H, as for HK hive name, process it as subkey path.
					// WARNING: Do not trim. Keys in path can contain and end with a space character.
					var subPath = line.slice(trimBy);
					if (subPath === '')
						continue
					if (options.lowercase)
						subPath = subPath.toLowerCase();
					scope = traverseKeyPath(root, subPath, recursive, options.format);
					break
			}
		}

		return root
	};


	// returns single value
	// Warning: 'reg' command is case insensitive and value names in the results are as well.
	Registry.getValue = async function(path, name = Registry.DEFAULT, options) {
		// Allow both forwardslashes and backslashes
		path = sanitizePath(path);
		options = getOptions(options);
		// Create query for retrieving only single value entry. Either the default one (empty string) or concrete named.
		if (name === Registry.DEFAULT)
			var result = await execute(['query', path, '/ve']);
		else
			var result = await execute(['query', path, '/v', name]);
		// Short circuit further processing if the key at given path was not found and undefined was returned.
		if (result === undefined) return

		// Split result by lines and find the one starting with space - that's the one with value.
		var line = result
			.split('\r\n')
			.find(line => line[0] === ' ');
		// Parse the lino into entry object and return it (or only the data if simple result is requested).
		var entry = processValueLine(line, options);
		if (options.format === Registry.FORMAT_SIMPLE)
			return entry.data
		else
			return entry
	};


	// Returns an array of subkeys (or their full paths).
	Registry.getKeys = async function(path, options) {
		// Allow both forwardslashes and backslashes
		path = sanitizePath(path);
		options = getOptions(options);
		// Create simple query at given path
		var result = await execute(['query', path]);
		// Short circuit further processing if the key at given path was not found and undefined was returned.
		if (result === undefined) return
		// REG can take shorter paths, but returns strictily long paths.
		// Convert the query path to full path.
		var fullPath = extendKeyPath(path);
		// Each line that starts with HK is a path of a subkey (or self).
		var keyPaths = result
			.split('\r\n')
			.filter(line => line.startsWith('HK'))
			.filter(line => line !== fullPath);
		// simple format trims whole HK.. path and only returns subkeys (the name after last slash).
		if (options.format === Registry.FORMAT_SIMPLE) {
			let trimBy = fullPath.length + 1;
			keyPaths = keyPaths.map(path => path.slice(trimBy));
		}
		// Paths and names in registry are case insensity, we can lowercase at this point without loosing any details.
		if (options.lowercase)
			keyPaths = keyPaths.map(path => path.toLowerCase());
		// return processed paths or subkey names.
		return keyPaths
	};


	Registry.getValues = async function(path, options) {
		// Allow both forwardslashes and backslashes
		path = sanitizePath(path);
		options = getOptions(options);
		// Create simple query at given path
		var result = await execute(['query', path]);
		// Short circuit further processing if the key at given path was not found and undefined was returned.
		if (result === undefined) return
		// Split result by lines and only keep the ones starting with space - only those contain value entry.
		var entries = result
			.split('\r\n')
			.filter(line => line[0] === ' ')
			.map(line => processValueLine(line, options));
		// Output in simple or complex format.
		if (options.format === Registry.FORMAT_SIMPLE) {
			var outObject = {};
			entries.forEach(entry => outObject[entry.name] = entry.data);
			return outObject
		} else {
			return entries
		}
	};


	// Returns true if a key at the path exists
	Registry.hasKey = function(path) {
		// Allow both forwardslashes and backslashes
		path = sanitizePath(path);
		// Create query for retrieving only single value entry. Either the default one (empty string) or concrete named.
		// 'false' argument disables suppression of not found errors for simpler handling (with catch statement).
		return execute(['query', path])
			.then(result => result === undefined ? false : true)
	};


	// Returns true if a value at the path exists
	Registry.hasValue = async function(path, name = Registry.DEFAULT) {
		// Allow both forwardslashes and backslashes
		path = sanitizePath(path);
		// Create query for retrieving only single value entry. Either the default one (empty string) or concrete named.
		// 'false' argument disables suppression of not found errors for simpler handling (with catch statement).
		if (name === Registry.DEFAULT)
			var result = await execute(['query', path, '/ve']);
		else
			var result = await execute(['query', path, '/v', name]);
		if (result === undefined) return false
		// Default value name is represented by a word default in brackets.
		if (name === Registry.DEFAULT)
			name = Registry.DEFAULT_VERBOSE;
		// Split the result into lines and try to find the searched one.
		// NOTE: not needed to lowercase the result, REG always returns queried value name in the same caps.
		return result
			.split('\r\n')
			.some(line => line.startsWith(`    ${name}`))
	};


	function traverseKeyPath(root, path, recursive, format, ensureExists = true) {
		var sections = path.split('\\');

		if (format === Registry.FORMAT_SIMPLE) {

			var current = root;
			while (sections.length) {
				let section = sections.shift();
				if (current[section] !== undefined && current[section] !== null)
					current = current[section];
				else if (ensureExists)
					current = current[section] = createKeyStructure(format, recursive);
				else
					return
			}

		} else {

			var current = root;
			while (sections.length) {
				let section = sections.shift();
				if (current.keys[section] !== undefined && current.keys[section] !== null) {
					current = current.keys[section];
				} else if (ensureExists) {
					let newDescriptor = createKeyStructure(format, recursive);
					current.keys[section] = newDescriptor;
					current = newDescriptor;
				} else {
					return
				}
			}

		}

		return current
	}


	function createKeyStructure(format, recursive) {
		if (format === Registry.FORMAT_SIMPLE) {
			// '$values' (or custom defined) is an object among other subkeys.
			// value entries are stored as name-value pairs and information about type is dropped.
			// collision can occur if key has subkey of the same name ('$values' or custom defined).
			return {
				[Registry.VALUES]: {
					//[Registry.DEFAULT]: undefined
				}
			}
		} else {
			// 'keys' is an object that will keep nesting structure of the same shape.
			// 'values' is an array of objects descibing value entries as {name, type, data}
			return {
				keys: {},
				values: [
					//{
					//	name: Registry.DEFAULT,
					//	type: 'REG_SZ',
					//	data: undefined
					//}
				],
			}
		}
	}


	function assignValueEntry(scope, entry, format) {
		if (format === Registry.FORMAT_SIMPLE) {
			scope[Registry.VALUES][entry.name] = entry.data;
		} else {
			//if (entry.name === Registry.DEFAULT)
			//	scope.values = scope.values.filter(entry => entry.name !== Registry.DEFAULT)
			scope.values.push(entry);
		}
	}


	function processValueLine(line, options) {
		// value line starts with 4 spaces and consists of three items that are also spaces by 4 spaces.
		// WARNING: Do not trim. Lines only start with 4 spaces, they don't end with 4 spaces unsless the value is empty string.
		var [name, type, data] = line.slice(4).split('    ');
		if (name === '(Default)')
			name = Registry.DEFAULT;
		if (data === '(value not set)')
			data = undefined;
		else if (options.lowercase)
			name = name.toLowerCase();
		// Convert REG_BINARY value into buffer
		var [data, type] = parseValueData(data, type);
		return {name, type, data}
	}

	// Just like static .set() but first argument 'path' can be omitted,
	// or used a relative path starting with '//' like '//supath'
	Registry.prototype.set = function(...args) {
		return Registry.set(...this._formatArgs(args))
	};


	// Creates or overwrites value entry at given inside a key.
	Registry.set = function(path, ...args) {
		if (args.length === 0)
			return Registry.setKey(path)
		else
			return Registry.setValue(path, ...args)
	};


	// Creates a key at given path.  Does nothing if the key already exists.
	Registry.setKey = async function(path) {
		// Allow both forwardslashes and backslashes
		path = sanitizePath(path);
		// Note: Not returning, the output of the reg command saying 'operation completed successfully'.
		//       Only await the process to finish. If any error occurs, the thrown error will bubble up.
		await execute(['add', path, '/f']);
	};


	// Creates or overwrites value entry at given inside a key.
	Registry.setValue = async function(path, name, data, type) {
		// Allow both forwardslashes and backslashes
		path = sanitizePath(path);
		// 'name' argument can only be string, otherwise it's and object of values and possible nested subkeys.
		if (typeof name !== 'string') {
			data = name;
			name = undefined;
		}
		// Arguments: path, name[, data[, type]]
		return _setValue(path, name, data, type)
	};
	async function _setValue(path, name, data = '', type) {
		if (isObject(data)) {
			if (name)
				path += `\\${name}`;
			var promises = Object.keys(data)
				.map(name => _setValue(path, name, data[name]));
			return Promise.all(promises)
		}
		// Uppercase and make sure the type starts with REG_
		type = sanitizeType(type);
		// Prepare the data to be put into string cli command.
		var [data, type] = inferAndStringifyData(data, type);
		// Throw if the type is incorrect
		if (!TYPES.includes(type))
			throw Error(`Illegal type '${type}', should be one of: '${TYPES.join('\', \'')}'`)
		var args = ['add', path];
		// Create or overwrite the default or named value entry.
		if (name === Registry.DEFAULT)
			args.push('/ve');
		else
			args.push('/v', name);
		// Type should always be defined.
		if (type !== undefined)
			args.push('/t', type);
		// Data might not be defined.
		if (data !== undefined)
			args.push('/d', data);
		// Forces potential overwrite withou prompting.
		args.push('/f');
		// Note: Not returning, the output of the reg command saying 'operation completed successfully'.
		//       Only await the process to finish. If any error occurs, the thrown error will bubble up.
		await execute(args);
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

	Registry.prototype.delete = function(...args) {
		return Registry.delete(...this._formatArgs(args))
	};

	Registry.prototype.clear = function(...args) {
		return Registry.clear(...this._formatArgs(args))
	};


	// Deletes the registry key and all of its subkeys and values.
	Registry.delete = function(path, name) {
		if (name === undefined)
			return Registry.deleteKey(path)
		else
			return Registry.deleteValue(path, name)
	};

	// Deletes all values and subkeys of a key at given path and preserves the key itself.
	Registry.clear = async function(path) {
		await Promise.all([
			Registry.clearValues(path),
			Registry.clearKeys(path)
		]);
	};


	// Deletes the registry key and all of its subkeys and values
	Registry.deleteKey = async function(path) {
		// Allows both forwardslashes and backslashes
		path = sanitizePath(path);
		// Note: Not returning, the output of the reg command saying 'operation completed successfully'.
		//       Only await the process to finish. If any error occurs, the thrown error will bubble up.
		await execute(['delete', path, '/f']);
	};


	// Deletes single value entry inside the key (or default value if no name given).
	Registry.deleteValue = async function(path, name = Registry.DEFAULT) {
		// Allows both forwardslashes and backslashes
		path = sanitizePath(path);
		if (name === Registry.DEFAULT)
			var args = ['delete', path, '/ve', '/f'];
		else
			var args = ['delete', path, '/v', name, '/f'];
		// Note: Not returning, the output of the reg command saying 'operation completed successfully'.
		//       Only await the process to finish. If any error occurs, the thrown error will bubble up.
		await execute(args);
	};



	// Deletes all values inside the key. Preserves the key iteself and its subkeys.
	Registry.clearValues = async function(path) {
		// Allows both forwardslashes and backslashes
		path = sanitizePath(path);
		// Note: Not returning, the output of the reg command saying 'operation completed successfully'.
		//       Only await the process to finish. If any error occurs, the thrown error will bubble up.
		await execute(['delete', path, '/va', '/f']);
	};


	// Deletes all subkeys inside the key. Preserves the key's values.
	Registry.clearKeys = async function(path) {
		// Allows both forwardslashes and backslashes
		path = sanitizePath(path);
		// Get list of keys and delete them one by one
		var keys = await Registry.getKeys(path);
		var promises = keys.map(key => Registry.delete(`${path}\\${key}`));
		await Promise.all(promises);
	};

	exports.default = Registry;
	exports.Registry = Registry;
	exports._replaceProcessSpawner = _replaceProcessSpawner;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
