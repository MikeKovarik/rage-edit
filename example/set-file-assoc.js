var {Registry} = require('../index.js')


var base = `HKCU\\Software\\Classes`

// Set Notepad as a program to open .foobar files
var ext = 'foobar'
var exePath = '%SystemRoot%\\system32\\NOTEPAD.EXE'
var appName = 'FooBar Notepad Editor'
var fileName = 'FooBar Document'
var icon = `%SystemRoot%\\system32\\imageres.dll,-102`

registerExtension(ext, exePath, appName, fileName, icon)
	.then(() => console.log('done'))
	.catch(err => console.log('ERR', err))

async function registerExtension(ext, exePath, appName, fileName, icon, appKey) {
	if (!appKey)
		appKey = appName.replace(/ /g, '') + '.' + ext
	var dotExt = `.${ext}`
	await Registry.set(`${base}\\.${ext}`, '', appKey)
	await Registry.set(`${base}\\${appKey}`, '', fileName)
	await Registry.set(`${base}\\${appKey}\\shell\\open\\command`, '', `${exePath} "%1"`, {type: 'REG_EXPAND_SZ'})
	await Registry.set(`${base}\\${appKey}\\DefaultIcon`, '', icon)
}
