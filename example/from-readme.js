var {Registry} = require('../index.js')


async function staticMode() {
	// Creates Overwatch key inside HKLM\SOFTWARE if it doesn't exist yet.
	// Also creates default value inside it (with data 'Soldiers, scientists, adventurers, oddities...')
	await Registry.set('HKLM\\SOFTWARE\\Overwatch', '', 'Soldiers, scientists, adventurers, oddities...')
	// Gets value of 'Scientists' from key 'HKLM\Software\Overwatch'
	await Registry.get('HKLM\\Software\\Overwatch', 'Scientists')
	// Creates/rewrites value entry 'hq' with data 'Switzerland' at 'HKLM\Software\Overwatch'
	await Registry.set('HKLM\\Software\\Overwatch', 'hq', 'Switzerland')
	// Creates/rewrites value 'Leader' at 'HKLM\Software\Overwatch\Backwatch'
	await Registry.set('HKLM\\Software\\Overwatch\\Blackwatch', 'Leader', 'Gabriel Reyes')
	// Retrieves the 'leader' value from 
	// NOTE: case insensitivity
	await Registry.get('hklm\\software\\overwatch\\blackwatch', 'leader')
}

async function instanceMode() {
	// Creates the instance but does not yet create the Overwatch key if it doesn't exists yet.
	var reg = new Registry('HKLM\\Software\\Overwatch')
	console.log(reg.path)
	console.log(reg.hive)
	console.log(reg.hiveFull)
	// Creates default value inside the key (with data 'Soldiers, scientists, adventurers, oddities...')
	await reg.set('', 'Soldiers, scientists, adventurers, oddities...')
	// Gets value of 'Scientists' from key 'HKLM\Software\Overwatch'
	await reg.get('Scientists')
	// Creates/rewrites value entry 'hq' with data 'Switzerland' at 'HKLM\Software\Overwatch'
	await reg.set('hq', 'Switzerland')
	// Creates/rewrites value 'Leader' at 'HKLM\Software\Overwatch\Backwatch'
	await reg.set('\\Blackwatch', 'Leader', 'Gabriel Reyes')
	// Retrieves the 'leader' value from 
	// NOTE: case insensitivity
	await reg.get('\\blackwatch', 'leader')
}


//staticMode()
instanceMode()
	.catch(err => console.log('ERR', err))