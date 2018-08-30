import fs from 'fs'


var pkg = JSON.parse(fs.readFileSync('package.json').toString())
var nodeCoreModules = require('repl')._builtinLibs
var external = [...nodeCoreModules, ...Object.keys(pkg.dependencies || {})]
var globals = objectFromArray(external)

export default {
	treeshake: false,
	input: 'index.mjs',
	output: {
		file: `index.js`,
		format: 'umd',
		name: pkg.name,
		globals,
	},
	external,
}

function objectFromArray(arr) {
	var obj = {}
	arr.forEach(moduleName => obj[moduleName] = moduleName)
	return obj
}