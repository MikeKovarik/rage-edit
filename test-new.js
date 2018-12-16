const {Registry} = require('./index.js')
const {assert} = require('chai')


// I don't know why chai doesn't have this
assert.isError = (maybeErr, message = 'expected to be error') => {
	assert.instanceOf(maybeErr, Error, message)
}
assert.isNotError = (maybeErr, message = 'expected to not be error') => {
	if (maybeErr !== undefined)
		assert.isFalse(maybeErr instanceof Error, message)
}
assert.willThrow = async promise => {
	assert.isError(await promise.catch(err => err), 'expected to throw')
}
assert.willNotThrow = async promise => {
	assert.isNotError(await promise.catch(err => err), 'expected to not throw')
}


// Promise wrapper for child_process.spawn().
var spawn = async (program, args) => {
	var cp = require('child_process')
	var stdio = ['ignore', 'pipe', 'pipe']
	var promiseOnce = (eventEmitter, event) => {
		return new Promise(resolve => eventEmitter.once(event, resolve))
	}
	var proc = cp.spawn(program, args, {stdio})
	
	var stdout = ''
	var stderr = ''
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


const isNode64bit    = (process.arch == 'x64')
const isNode64bitMsg = 'this test can be passed on 64-bit node.js only'

const PATH_ROOT        = 'HKLM\\SOFTWARE\\MikeKovarik'
const PATH_ROOT_32BIT  = 'HKLM\\SOFTWARE\\WOW6432Node\\MikeKovarik'
const PATH             = `${PATH_ROOT}\\rage-edit`
const PATH_32BIT       = `${PATH_ROOT_32BIT}\\rage-edit`
const PATH_NONEXISTENT = 'HKCR\\Some\\made\\up\\path\\that\\doesnt\\exist'
const PATH_BLOCK       = 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Shell Extensions\\Blocked'

function noop() {}
var resolveError = err => err
var genUID = () => `${Date.now()}-${process.hrtime().join('')}`

// Registry.debug = true

describe('[service] Prepare registry for tests', () => {

	it('import .reg file', async () => {
		await spawn('reg.exe', ['import', `${__dirname}\\test.reg`])
	})
	
	it('.reg file is imported properly', async () => {
		const VALUE = 'rage-edit tests'
		var {stdout} = await spawn('reg.exe', ['query', PATH, '/ve'])
		assert.include(stdout, VALUE, `Default value of "${PATH}" doesn't equal "${VALUE}"`)
	})
	
})


// Actual tests go here ...


describe('[service] Clean up registry', () => {

	it('delete test keys', async () => {
		await spawn('reg.exe', ['delete', PATH_ROOT, '/f'])
		await spawn('reg.exe', ['delete', PATH_ROOT_32BIT, '/f'])
	})
	
	it('test keys are deleted', async () => {
		var {stderr} = await spawn('reg.exe', ['query', PATH])
		assert.isNotEmpty(stderr)
		var {stderr} = await spawn('reg.exe', ['query', PATH_32BIT])
		assert.isNotEmpty(stderr)
	})
	
})