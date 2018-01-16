import fs from 'fs'


var pkg = fs.readFileSync('package.json')
pkg = JSON.parse(pkg.toString())

var nodeCoreModules = require('repl')._builtinLibs
var globals = objectFromArray(nodeCoreModules)

export default {
	treeshake: false,
	input: 'index.mjs',
	output: {
		file: `index.js`,
		format: 'umd',
	},
	name: pkg.name,
	globals,
}

function objectFromArray(arr) {
	var obj = {}
	arr.forEach(moduleName => obj[moduleName] = moduleName)
	return obj
}