var {Registry} = require('../index.js')


Registry.set('HKCR\\Directory\\background\\shell\\bash', {
	'': 'Open Bash here',
	icon: 'bash.exe',
	command: {
		'': 'cmd.exe /c pushd "%V" && bash.exe'
	}
})
.then(() => console.log('Bash added to context menu'))
.catch(err => console.error(err))
