var {Registry} = require('../index.js')


async function main() {

	await Registry.set('HKCU\\SOFTWARE\\Overwatch')
	console.log('Written to HKCU without admin priviledges.')
	await Registry.set('HKLM\\SOFTWARE\\Overwatch')
	console.log('Written to HKLM with admin priviledges.')

}

main()
	.catch(err => console.log(`Couldn't write to HKLM without admin priviledges.`))