/*

  Example output:

  # Installed applications:
  * 7-Zip 17.01 beta (x64) (64-bit)
  * AkelPad 4.9.8-x64 (64-bit)
  * ConEmu 180626.x64 (64-bit)
  * DB Browser for SQLite (32-bit)
  * Link Shell Extension (64-bit)
  ...

*/

var {Registry} = require('../index.js')

// Helper function: gets `$values.displayname` of each key
function filterAppNames(key) {
  return Object.keys(key)
    .map(id => key[id].$values ? key[id].$values.displayname : null)
    .filter(name => name) // No falsy items
}

async function main() {
  const path = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
  let apps = {}

  console.log('Reading registry...')
  
  // 'recursive' allows to dig deeper and get applications names
  // 'bits' allow to get access to particular part of registry
  // 'enableUnicode' prevents rendering question marks for non-ASCII characters on locales other than English
  // Note: use the 'enableUnicode()' function for multiple calls and a 'unicode: true' option for a single call. Check readme for details.
  try {
    await Registry.enableUnicode()
    apps[64] = await Registry.get(path, {recursive: true, bits: 64})
    apps[32] = await Registry.get(path, {recursive: true, bits: 32})
  } finally {
    // Disabe unicode even if a wild error appeared
    await Registry.disableUnicode()
  }

  // Get apps names and append '(64-bit)' or '(32-bit)' to each of them
  apps[64] = filterAppNames(apps[64]).map(name => `${name} (64-bit)`)
  apps[32] = filterAppNames(apps[32]).map(name => `${name} (32-bit)`)

  // Join and sort arrays
  apps['all'] = [...apps[64], ...apps[32]].sort()

  console.log('# Installed applications:')
  console.log('*', apps['all'].join(('\n* ')))
}

main()
  .catch(err => console.log(err))