var {Registry} = require('../index.js')


getExtension('txt')
	.then(association => console.log(association))
	.catch(err => console.log('ERR', err))

async function getExtension(ext) {
	var appPath = await getGlobalPath('HKCU\\Software\\Classes', ext)
	if (appPath) return appPath
	appPath = await getGlobalPath('HKCR', ext)
	if (appPath) return appPath
	var path = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.${ext}\\OpenWithList`
	var values = await Registry.getValues(path)
	if (!values.mrulist) return
	var handlerName = values[values.mrulist[0]]
	appPath = await Registry.get(`HKCU\\Software\\Classes\\Applications\\${handlerName}\\shell\\open\\command`, '')
	if (appPath) return appPath
	appPath = await Registry.get(`HKCR\\Applications\\${handlerName}\\shell\\open\\command`, '')
	return appPath
}

async function getGlobalPath(base, ext) {
	var handlerKeyName = await Registry.get(`${base}\\.${ext}`, '')
	if (handlerKeyName)
		return Registry.get(`${base}\\${handlerKeyName}\\shell\\open\\command`, '')
}