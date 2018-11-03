# rage-edit

[![NPM](https://img.shields.io/npm/v/rage-edit.svg)](https://www.npmjs.com/package/rage-edit)
[![Dependency Status](https://david-dm.org/MikeKovarik/rage-edit.svg)](https://david-dm.org/MikeKovarik/rage-edit)
[![devDependency Status](https://david-dm.org/MikeKovarik/rage-edit/dev-status.svg)](https://david-dm.org/MikeKovarik/rage-edit#info=devDependencies)
[![Maintenance Status](http://img.shields.io/badge/status-maintained-brightgreen.svg)](https://github.com/MikeKovarik/rage-edit/pulse)
[![Known Vulnerabilities](https://snyk.io/test/github/MikeKovarik/rage-edit/badge.svg)](https://snyk.io/test/github/MikeKovarik/rage-edit)
[![Discord](https://img.shields.io/discord/419198557363634178.svg)](https://discord.gg/v2mUmeD)
[![Gitter](https://badges.gitter.im/MikeKovarik/rage-edit.svg)](https://gitter.im/MikeKovarik/rage-edit?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Maintainability](https://api.codeclimate.com/v1/badges/f4c0ee405c46126d6325/maintainability)](https://codeclimate.com/github/MikeKovarik/rage-edit/maintainability)

🗃 Simple access to, and manipulation of, the Windows Registry. With promises. Without rage.


## Installation

```js
npm install rage-edit
```

## Keep in mind before using


### Structure and naming (keys & values) in the Windows Registry

Please be advised that the `key` and `value` terminology from the Windows registry might be confusing because it's different than the naming widely used in the world of JS. Windows registry is much like file system with folders and files, or XML, rather than JSON.

In JSON, `key` usually stands for name of the property that stores a `value`.

In the Windows registry, `key` is like a folder (or the path to it) that can contain multiple `value`s, which are kind of like files. `value` has a name and the data content it stores (and type of the data).

So when refering to `value`, its name is often meant rather than the data it holds.

To lessen the confusion, we're often using terms like value entry, value name, name of the value entry, etc... and path stands for the path of the key.


### Default value (empty string)

Every windows registry key always contains a default value with the empty string `''` for name. 

```js
// read default value
await Registry.get('HKLM\\SOFTWARE\\Overwatch', '')
// write default value
await Registry.set('HKLM\\SOFTWARE\\Overwatch', '', 'Soldiers, scientists, adventurers, oddities...')
```
[See *Default values* section for more](#default-values)

### Case in/sensitivity

Key path and value names are case insensitive, you can interchangeably read, write and delete with any combination of casing. `rage-edit` lowercases everything by default.

```js
await Registry.get('HKCR\\.exe', 'Content Type') // returns the data
await Registry.get('hkcr\\.exe', 'content type') // returns the data
```
[See *Case sensitivity* section for more](#case-sensitivity)

# API

## `Registry` class

Only the `Registry` class is exported (both named and default export)

```js
// ES Modules way
import {Registry} from 'rage-edit'
import Registry from 'rage-edit'
// CJS way
var {Registry} = require('rage-edit')
```

It is modelled after ES6 `Map` class with methods like `.get()`, `.set()`, `.delete()` and a few others. Those can be used in two modes - static and instance.

### Static mode

```js
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
``` 

### Instance mode

```js
// Creates the instance but does not yet create the Overwatch key if it doesn't exists yet.
var reg = new Registry('HKLM\\Software\\Overwatch')
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
``` 


## Static methods

### `.get(path, [name])`

Retrieves key from `path` or content of the `name`d value entry at the path.

#### Parameters:
- `path` to a key to retrieve or from where to retrieve the value.
- `[name]` of the value to retrieve. Optional. Default value (empty string) is retrieved if omitted.

#### Returns:
`Promise<object>`

#### Example
```js
// Retrieves key 'HKLM\Software\Overwatch'.
Registry.get('HKLM\\Software\\Overwatch')
// Retrieves default value from 'HKLM\Software\Overwatch'.
Registry.get('HKLM\\Software\\Overwatch', '')
// Retrieves value 'Scientists' from 'HKLM\Software\Overwatch'.
Registry.get('HKLM\\Software\\Overwatch', 'Scientists')
```


### `.has(path, [name])`

Just like `.get()` but returns boolean depending on existence of the key or value.

#### Returns:
`Promise<bool>`


### `.delete(path, [name])`

Deletes a registry key at the given `path` or deletes a `name`d value entry within this key.

#### Parameters
- `path` of the key to delete, or the key that hosts the value to delete.
- `[name]` of the value to delete.

#### Returns
`Promise`

#### Example
```js
// Deletes subkey 'Blackwatch' (with all of its subkeys and values) inside 'HKLM\Software\Overwatch'
Registry.delete('HKLM\\Software\\Overwatch\\Blackwatch')
// Deletes value 'Scientists' from 'HKLM\Software\Overwatch'
Registry.delete('HKLM\\Software\\Overwatch', 'Scientists')
// Deletes default value entry (empty string, can be omitted) from 'HKLM\Software\Overwatch'
Registry.delete('HKLM\\Software\\Overwatch', '')
// Deletes the key 'HKLM\Software\Overwatch' and all of its subkeys and values
Registry.delete('HKLM\\Software\\Overwatch')
```



### `.set(path[, name[, data[, type]]])`

Creates or rewrites a key or `name`d value inside a key at the given `path`.

If a key at the path doesn't exist it will be created as if `Registry.set(path)` was called beforehand.

Creating new keys also creates an empty default value inside it (that's how windows registry works) as if `Registry.set(path, '', '', 'REG_SZ')` was called with it.

#### Parameters
- `path` of the key where the value should be created.
- `[name]` of the value to create or modify. Optional. To modify the key's default value (empty string) use `''`.
- `[data]` to store in the value entry. Optional.
- `[type]` of the stored `data`. Optional. It is inferred from the `data` if this parameter is omitted.

|JS type|Registry type|
|-|-|
|`String`|`REG_SZ`, `REG_EXPAND_SZ`|
|`Number`|`REG_DWORD`|
|`Array<String>`|`REG_MULTI_SZ`|
|`Buffer`, `Uint8Array`, `ArrayBuffer`|`REG_BINARY`|

#### Returns

`Promise`

#### Example

```js
// Creates or rewrites value entry named 'Leader' with 'Jack Morrison' data of 'REG_SZ' type that is infered from the String data.
// inside the key 'HKLM\Software\Overwatch'. Also creates the key if it didn't exist
Registry.set('HKLM\\Software\\Overwatch', 'Leader', 'Jack Morrison')
// Creates or rewrites value 'Scientists' with data 'Angela Ziegler\0Winston\0Mei-Ling Zhou' of type 'REG_MUTLI_SZ' (inferred from Array data)
Registry.set('HKLM\\Software\\Overwatch', 'Scientists', ['Angela Ziegler', 'Winston', 'Mei-Ling Zhou'])
// Re/writes data of default value entry.
Registry.set('HKLM\\Software\\Overwatch', '', 'This is data of the default value entry')
// Creates a new subkey 'Blackwatch' inside 'HKLM\Software\Overwatch' and creates default value with data Mysterious branch of Overwatch'
Registry.set('HKLM\\Software\\Overwatch\\Blackwatch', '', 'Mysterious branch of Overwatch')
```



## Static properties


**`DEFAULT = ''`** String used to represent the name of the default value.

**`VALUES = '$values'`** String used for naming values key in [simple mode](#simple)






## Constructor, instance mode

### `new Registry(path)`

```js
var reg = new Registry('HKLM\\Software\\Overwatch')
reg.get('Scientists')
reg.set('\\Blackwatch', 'Leader', 'Gabriel Reyes')
```




## Instance methods


### `#get([subpath][, name])`

Retrieves key from the instance's path or from a given `subpath`.
Or instead retrieves content of a value at the path if `name` is defined.

#### Parameters:
- `[subpath]` Path to a subkey where the value is stored. Optional. Defaults to `this.path`.
- `[name]` of the value to retrieve. Optional. Default value (empty string) is retrieved if omitted.

#### Returns:
`Promise<object>`

#### Example
```js
// Creates instance of Registry, using 'HKLM\Software\Overwatch' path for all operations by default.
var reg = new Registry('HKLM\\Software\\Overwatch')
// Retrieves key 'HKLM\Software\Overwatch'.
reg.get()
// Retrieves default value from 'HKLM\Software\Overwatch'.
reg.get('')
// Retrieves value 'Scientists' from 'HKLM\Software\Overwatch'.
reg.get('Scientists')
// Retrieves subkey 'Blackwatch' inside 'HKLM\Software\Overwatch'.
reg.get('\\Blackwatch')
// Retrieves default value from 'HKLM\Software\Overwatch\Backwatch'
reg.get('\\Blackwatch', '')
// Retrieves value 'Leader' from 'HKLM\Software\Overwatch\Backwatch'
reg.get('\\Blackwatch', 'Leader')
```



### `#has([subpath][, name])`

Just like `.get()` but returns boolean depending on existence of the sub/key or value.

#### Returns:
`Promise<bool>`



### `#delete([subpath][, name])`

Deletes the instance's registry key or subkey at given `subath`.
Alternatively deletes `name`d value from the key.

#### Parameters:
- `[subpath]` Path to a subkey where the value is stored. Optional. Defaults to `this.path`.
- `[name]` of the value to delete.

#### Returns:
`Promise`



### `#set([subpath][, name[, data[, type]]])`

Creates or rewrites `name`d value inside instance's path or at given `subpath` key.
Alternatively creates subkey at `subpath` if `name` and `data` are undefined.

#### Parameters
- `[subpath]` Path of the subkey to create (or where to set value). Optional if `name` is defined. **`subpath` has to always begin with a backslash `\` otherwise it will be mistaken as `name`**
- `[name]` of the value to create or modify. Optional if `subpath` is defined in which case no value is created, only the subkey. To modify key's default value (empty string) use `''`.
- `[data]` to be stored in the value entry. Optional.
- `[type]` of the stored `data`. Optional. It is inferred from the `data` if this parameter is omitted.

#### Returns:
`Promise`

#### Example
```js
// Creates instance of Registry, using 'HKLM\Software\Overwatch' path for all operations by default.
var reg = new Registry('HKLM\\Software\\Overwatch')
// Creates the key (if it didn't exist)
reg.set()
// Creates 'disbanded' value with no data
reg.set('disbanded')
// Creates or rewrites value entry named 'Leader' with 'Jack Morrison' data of 'REG_SZ' type that is infered from the String data.
// inside the key 'HKLM\Software\Overwatch'. Also creates the key if it didn't exist
reg.set('Leader', 'Jack Morrison')
// Creates or rewrites value 'Scientists' with data 'Angela Ziegler\0Winston\0Mei-Ling Zhou' of type 'REG_MUTLI_SZ' (inferred from Array data)
reg.set('Scientists', ['Angela Ziegler', 'Winston', 'Mei-Ling Zhou'])
// Re/writes data of default value entry.
reg.set('', 'This is data of the default value entry')
// Creates a key 'HKLM\Software\Overwatch\Blackwatch' (if it didn't exist)
reg.set('\\Blackwatch')
// Creates a new subkey 'Blackwatch' inside 'HKLM\Software\Overwatch' and creates default value with data Mysterious branch of Overwatch'
reg.set('\\Blackwatch', '', 'Mysterious branch of Overwatch')
// Creates/rewrites value 'Leader' at 'HKLM\Software\Overwatch\Backwatch'
reg.set('\\Blackwatch', 'Leader', 'Gabriel Reyes')
```


## Instance properties

**`path`** Full path of current key path.

**`hive`** Short name of the current hive like `HKCU`.





## Output format

Retrieving data from the registry poses a complication. Format of the output cannot be as straight forward as JSONs nested structure because the registry better resembles an XML tree where each node can have both a children nodes and also attributes. A Windows registry key can host sub keys as well as value entries, both of which can have the same names leading to possible collisions.

Due to that `rage-edit` offers two types of output formats. `simple` and `complex`. By default `simple` is enabled globally for all calls.

It can be set as a global default for all method calls, or specified manually in each method call in the `options` argument.

```js
// change format globally
Registry.format = 'complex'
// or individually
Registry.get('HKCR\\Directory\\shell', {format: 'complex'}
```


### Simple

Simple output tries to resemble JSON at much as possible while trying to avoid collisions with the names of keys and values.

Key names are properties of the object. The key is represented by (stub of) another object. This is useful when calling `Registry.get()` in recursive mode.

Values are stored in `$values` object of `name:data` pairs, where value name is the property, value data is the content of that property, and type is omitted.

*Warning: `$values` might be still conflicting since `$` is a valid character in key paths. You can change `$values` to be whatever else by changing `Registry.VALUES`. e.g. `Registry.VALUES = '__$$NO_CONFLICT_VALUES'`*

So if your key has a subkey named `version` and also a value named `version`, you will be able to access both of them without collision with `output.version` and `output.$values.version`.

```js
// Registry.get('HKCR\\.jpg')
{
  $values: {
    '': 'jpegfile',
    'content type': 'image/jpeg',
    'perceivedtype': 'image'
  },
  'openwithprogids': {...},
  'persistenthandler': {...}
}
```

This format is optimized for nesting to allow you to do this.

*Note: `.get()` calls are not recursive by default due to performance reasons. The following snippet serves as an example of how output can be nested, but the `HKLM` hive contains enormous amounts of data and thus is not recommended to be queried recursively.*

```js
// Gets default value (empty string) of HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Lock Screen\FeedManager
var software = await Registry.get('HKLM\\software', true)
software.microsoft.windows.currentversion['Lock Screen'].feedmanager.$values['']
```

### Complex

Offers comprehensive output and first and foremost contains types of value entries since every value entry is represented by `{name, data, type}` object in a `values` array.

```js
// Registry.get('HKCR\\.jpg', {format: 'complex'})
{
  keys: {
    'openwithprogids': {
      keys: {...},
      values: [...]
    },
    'persistenthandler': {
      keys: {...},
      values: [...]
    }
  },
  values: [
    {
      name: '',
      data: 'jpegfile',
      type: 'REG_SZ'
    }, {
      name: 'content type',
      data: 'image/jpeg',
      type: 'REG_SZ'
    }, {
      name: 'perceivedtype',
      data: 'image',
      type: 'REG_SZ'
    }
  ]
}
```

Nesting with this format is much more verbose.

```js
// Gets default value (empty string) of HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Lock Screen\FeedManager
var software = await Registry.get('HKLM\\software', true, {format: 'complex'})
software.keys.microsoft.keys.windows.keys.currentversion.keys['Lock Screen'].keys.feedmanager.values['']
```



# Caveats, edge cases & the weirdness of Windows registry

Windows registry has its fair share of footguns that you should be aware of. Not to mention the danger of damaging keys and values that are critical for the proper operation of the OS.

### Friendly reminder about HKCR, HKLM, 64b and Wow6432Nodes

`HKCR` is a pointer to `HKLM\Software\Classes`. Use it to access all users.

`HKCU` is a pointer to `HKUS\${UserSid}` Use it to access only current user.

Therefore

`HKCU\Software\Classes` is a pointer to `HKUS\${UserSid}\Software\Classes` which is another pointer to `HKUS\${UserSid}_Classes`.

But on on 64b it points to subkey `Wow6432Nodes`, so `HKUS\${UserSid}\Software\Classes` is a pointer to `HKUS\${UserSid}_Classes\Wow6432Node` on 64b systems.

Example:
|original key|pointer to|b|
|-|-|-|
|`HKCU\Software\Classes\CLSID`|`HKUS\${UserSid}_Classes\CLSID`|32b|
|`HKCU\Software\Classes\CLSID`|`HKUS\${UserSid}_Classes\Wow6432Node\CLSID`|64b|

More info [here](https://mintywhite.com/vista/hkcr-hkcu-hklm-hku-hkcc-registry-root-keys/) and [here](https://msdn.microsoft.com/en-gb/library/aa384253%28v=VS.85%29.aspx?f=255&MSPPError=-2147217396
)

### Default values

**Every key has a default value (empty string) which is represented as an empty string**. I.e. name of the value entry is empty string `''`. You might also come across it as a `(Default)` in the `regedit` program or in `reg` command.

```js
(await Registry.get(path)).$values[''] // value of the default value at given path
await Registry.get(path, '') // get default value from the path
await Registry.set(path, '', 'data of the default value') // set default value's data
```

It is by default of type `REG_SZ`.

Creation of a new key also creates default value inside it. The value's name is an empty string `''` and the data content is also an empty string.
As long as the default value has any data, it will act as any other value and will show up in `getValues()`.

```js
await Registry.set(path)
await Registry.has(path, '') // true - default value exists in this key
await Registry.get(path, '') // '' - default value has data of an empty string
(await Registry.get(path)).$values // [''] - list of values in this key, so far only the default value
```
practical example:
```js
// creates new key and default value '' of type REG_SZ
await Registry.set('HKLM\\SOFTWARE\\Overwatch')
// creates or updates default value of type REG_SZ, inside key HKLM\SOFTWARE\Overwatch (also creates the key if it doesn't exists) 
await Registry.set('HKLM\\SOFTWARE\\Overwatch', '', 'Soldiers, scientists, adventurers, oddities...')
// creates or updates default value of type REG_EXPAND_SZ, inside key HKLM\SOFTWARE\Overwatch (also creates the key if it doesn't exists)
await Registry.set('HKLM\\SOFTWARE\\Overwatch', '', 'Soldiers, scientists, adventurers, oddities...', 'REG_EXPAND_SZ')
// sidenote: value name is '', value data is 'Soldiers, scientists, adventurers, oddities...')
```

**Default value cannot be deleted**. Attempting to do so (`Registry.delete(path, '')`) will not actually delete the entry, but only its data. Or rather it will set the data to some sort of `undefined` or `null` (can be seen as `(value not set)` in `regedit`), which is unique to the default value.

In this state, the default value returns `undefined` when queried with `get()` it will not be listed in `$values`, despite actually existing - `has()` always returns `true`.

```js
await Registry.delete(path, '')
await Registry.has(path, '') // true - the value always exists
await Registry.get(path, '') // undefined - the value has no data
(await Registry.get(path)).$value // [] - empty array
```


### Restricted access, administrator permissions

Write and delete operation outside `HKCU` hive (Current user) as well as reading certain hives require the app to run with administrator privileges.

```js
try {
  await Registry.set('HKCU\\SOFTWARE\\Overwatch')
  console.log('Written to HKCU without admin priviledges.')
  await Registry.set('HKLM\\SOFTWARE\\Overwatch')
  console.log('Written to HKLM with admin priviledges.')
} catch(err) {
  console.log(`Couldn't write to HKLM without admin priviledges.`)
}
```

### Error suppresion

`rage-edit` deliberately suppresses error `The system was unable to find the specified registry key or value` that is thrown by the `reg` command when a non-existent value or key is queried. Instead the promise is resolve with `undefined`.

All other errors (especially `Access is denied`) are thrown as expected and the promise will be rejected.

### Case sensitivity

**Windows Registry is case insensitive.** That applies to key paths and value names. But there are some edge cases. `rage-edit` by default transforms all key paths and value names (*not the actual data of value entry*) to lowercase by default to prevent confusion.

This does not affect input - you can still use all-caps paths and value names with uppercased characters.

```js
// both ways work and return the same value
await Registry.get('HKCR\\.exe', 'Content Type') // returns the data
await Registry.get('hkcr\\.exe', 'content type') // returns the data
await Registry.get('HKCR\\.exe\\PersistentHandler') // returns the data
await Registry.get('HkCr\\.exe\\persistentHANDLER') // returns the data
var key = await Registry.get('HKCR\\.exe')
key.persistenthandler // contains the data
key.PersistentHandler // undefined
key.$values['content type'] // contains the data
key.$values['Content Type'] // undefined
```

The lowercasing can be turned off

```js
// globally
Registry.lowercase = false
// or per request
var key = await Registry.get('HKCR\\.exe', {lowercase: false})
key.$values['Content Type']
```

#### Why?

Underlying REG command doesn't distinguish between lowercase or upper case. Direct queries for a certain value with `/v` argument always mimic the case in which the key and value name are inputted and never return the true case of the value name. In this case `PERCEIVEDTYPE`, `PerceivedType` and `perceivedtype`

```
reg query HKCR\.JPG /v PERCEIVEDTYPE

HKEY_CLASSES_ROOT\.JPG
    PERCEIVEDTYPE    REG_SZ    image
```

```
reg query HKCR\.Jpg /v PerceivedType

HKEY_CLASSES_ROOT\.Jpg
    PerceivedType    REG_SZ    image
```

```
reg query HKCR\.jpg /v perceivedtype

HKEY_CLASSES_ROOT\.jpg
    perceivedtype    REG_SZ    image
```

But omiting `/v` (value name) argument to query all contents of the key would return value entries with their true names (in this case `PerceivedType`).

```
C:\WINDOWS\system32>reg query HKCR\.jpg

HKEY_CLASSES_ROOT\.jpg
    (Default)    REG_SZ    jpegfile
    Content Type    REG_SZ    image/jpeg
    PerceivedType    REG_SZ    image
```

This however could cause performance issues (querying whole key when only single value is needed isn't a good idea) and the insensitive nature of Windows Registry lead `rage-edit` to deliberately lowercase all paths and value names to prevent situations like this:

```js
// rage-edit by default transforms all value names to lower case to prevent having to do this:
var key = await Registry.get('HKLM\\SOFTWARE\\MyApp')
var version = key.$values['VERSION'] || key.$values['Version'] || key.$values['version']
```

### Type infering and conversions

`rage-edit` automatically picks a registry value type for you, based in the data you're storing, if you don't specify the type for yourself.

```js
Registry.setValue('HKLM\\Some\\Path', 'name', 'string', 'REG_SZ')
Registry.setValue('HKLM\\Some\\Path', 'name', 'string')

Registry.setValue('HKLM\\Some\\Path', 'name', '123', 'REG_DWORD')
Registry.setValue('HKLM\\Some\\Path', 'name', 123, 'REG_DWORD')
Registry.setValue('HKLM\\Some\\Path', 'name', 123)

Registry.setValue('HKLM\\Some\\Path', 'name', 'one\0two\0three', 'REG_MULTI_SZ')
Registry.setValue('HKLM\\Some\\Path', 'name', ['one', 'two', 'three'], 'REG_MULTI_SZ')
Registry.setValue('HKLM\\Some\\Path', 'name', ['one', 'two', 'three'])

Registry.setValue('HKLM\\Some\\Path', 'name', 'hello', 'REG_BINARY')
Registry.setValue('HKLM\\Some\\Path', 'name', Buffer.from('hello'))
```


### REG_DWORD and REG_QWORD

Windows Registry allows storing 32b values as DWORDS and 64b values as QWORDS.

Javascript Number only support 53 bit integers.

DWORD values are automatically converted to and from Number by `rage-edit` automatically. 

QWORD values cannot be converted due to JS limitations. The `reg` command also retrieves the values in hex `Ox` notation and `rage-edit` does not change that.

```js
var value = 1234

Registry.set('HKLM\\Some\\Path', 'DwordValue', value)
Registry.set('HKLM\\Some\\Path', 'QwordValue', value)

Registry.get('HKLM\\Some\\Path', 'DwordValue') // 1234
Registry.get('HKLM\\Some\\Path', 'QwordValue') // '0x4D2'
```


## Join the discussion

We're at [Discord](https://discord.gg/v2mUmeD) and [Gitter](https://gitter.im/MikeKovarik/rage-edit). Come join us to discuss features, bugs and more.

## Credits

Made by Mike Kovařík, Mutiny.cz
