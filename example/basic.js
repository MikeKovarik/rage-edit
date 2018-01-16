var {Registry} = require('../index.js')


async function main() {

	var jpgComplex = await Registry.get('HKCR\\.jpg', {format: 'complex'})
	var jpgSimple = await Registry.get('HKCR\\.jpg')
	console.log('--------------------------------------------------------')
	console.log('JPG extension associations in simple format')
	console.log(JSON.stringify(jpgSimple, null, 2))
	console.log('--------------------------------------------------------')
	console.log('JPG extension associations in complex format')
	console.log(JSON.stringify(jpgComplex, null, 2))
	console.log('--------------------------------------------------------')

	// The static way 
	//await Registry.set('HKLM\\SOFTWARE\\Overwatch')
	//console.log('HKLM\\SOFTWARE\\Overwatch', 'created')
	await Registry.set('HKLM\\SOFTWARE\\Overwatch', '', 'Soldiers, scientists, adventurers, oddities...', 'REG_EXPAND_SZ')
	console.log('HKLM\\SOFTWARE\\Overwatch', 'created and default value set')
	await Registry.set('HKLM\\SOFTWARE\\Overwatch', 'Leader', 'Jack Morrison')
	console.log('HKLM\\SOFTWARE\\Overwatch', 'Leader value set')

	console.log('HKLM\\SOFTWARE\\Overwatch', '\'\' ===', await Registry.get('HKLM\\SOFTWARE\\Overwatch', ''))
	console.log('HKLM\\SOFTWARE\\Overwatch', 'Leader ===', await Registry.get('HKLM\\SOFTWARE\\Overwatch', 'Leader'))

	// The instance way 
	var reg = new Registry('HKLM\\SOFTWARE\\Overwatch')
	await reg.set('Scientists', ['Angela Ziegler', 'Winston', 'Mei-Ling Zhou'])
	console.log('HKLM\\SOFTWARE\\Overwatch', 'Scientists value set')
	console.log('HKLM\\SOFTWARE\\Overwatch', 'Scientists ===', await reg.get('Scientists'))

}

main()
	.catch(err => console.log('ERR', err))