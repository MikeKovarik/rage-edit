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


# Table of Contents

* [Keep in mind before using](#notes)
* [Usage](#usage)
  * [Static mode](#usage.static)
  * [Instance mode](#usage.instance)
* [Options](#options)
  * [`path` – Registry address](#options.path)
  * [`name` – Value name](#options.name)
  * [`data` – Value content](#options.data)
  * [`type` – Value type](#options.type)
  * [`lowercase` – Case in/sensitivity](#options.lowercase)
  * [`format` – Output format](#options.format)
  * [`bits` – Force 64/32bit registry view](#options.bits)
  * [`unicode` – Enable unicode support](#options.unicode)
  * [`recursive` – Retrieve content of subkeys](#options.recursive)
  * [`$isOptions` – Explicitly mark object as options object](#options.isOptions)
* [Methods](#methods)
  * [`.get()` – Read data from registry](#method.get)
  * [`.set()` – Write data to registry](#method.set)
  * [`.has()` – Check if key or value exists](#method.has)
  * [`.delete()` – Remove data from registry](#method.delete)
* [Static properties](#static)
  <!-- * [DEFAULT](#static.default)
  * [VALUES](#static.values)
  * [IS_OPTIONS](#static.isOptions) -->
* [Constructor, instance mode](#instance)
  * [new Registry()](#instance.constructor)
  * [Instance properties](#instance.properties)
  * [Examples](#instance.examples)
* [Caveats, edge cases & the weirdness of Windows registry](#caveats)
  * [Friendly reminder about HKCR, HKLM, 64-bit and Wow6432Nodes](#caveats.reminder)
  * [Default values](#caveats.default-values)
  * [Restricted access, administrator permissions](#caveats.permissions)
  * [Error suppresion](#caveats.error-suppresion)
  * [Case sensitivity](#caveats.case-sensitivity)
  * [Type infering and conversions](#caveats.type-infering)
* [Join the discussion](#discussion)
* [Credits](#credits)

# <a name="notes"></a>Keep in mind before using


## Structure and naming (keys & values) in the Windows Registry

Please be advised that the `key` and `value` terminology from the Windows registry might be confusing because it's different than the naming widely used in the world of JS. Windows registry is much like file system with folders and files, or XML, rather than JSON.

In JSON, `key` usually stands for name of the property that stores a `value`.

In the Windows registry, `key` is like a folder (or the path to it) that can contain multiple `value`s, which are kind of like files. `value` has a name and the data content it stores (and type of the data).

So when refering to `value`, its name is often meant rather than the data it holds.

To lessen the confusion, we're often using terms like value entry, value name, name of the value entry, etc... and path stands for the path of the key.


## Default value (empty string)

Every windows registry key always contains a default value with the empty string `''` for name. 

```js
// Read default value
await Registry.get('HKLM/SOFTWARE/Overwatch', '')

// Write default value
await Registry.set('HKLM/SOFTWARE/Overwatch', '', 'Soldiers, scientists, adventurers, oddities...')
```
[See *"Default values"* section for more](#caveats.default-values)


## Case in/sensitivity

Key path and value names are case insensitive, you can interchangeably read, write and delete with any combination of casing. `rage-edit` lowercases everything by default.

```js
await Registry.get('HKCR\\.exe', 'Content Type') // returns the data
await Registry.get('hkcr\\.exe', 'content type') // returns the data
```
[See *"Case sensitivity"* section for more](#caveats.case-sensitivity)


# <a name="usage"></a>Usage

Only the `Registry` class is exported (both named and default export)

```js
// ES Modules way
import { Registry } from 'rage-edit'
import Registry from 'rage-edit'

// CJS way
var { Registry } = require('rage-edit')
```

It is modelled after ES6 `Map` class with methods `.get()`, `.set()`, `.has()`, and `.delete()`. Those can be used in two modes - static and instance.


## <a name="usage.static"></a>Static mode

```js
// Creates Overwatch key inside HKLM\SOFTWARE if it doesn't exist yet.
// Also creates default value inside it (with data 'Soldiers, scientists, adventurers, oddities...')
// NOTE: both backslashes (\) and forward slashes (/) can be used
await Registry.set('HKLM/SOFTWARE/Overwatch', '', 'Soldiers, scientists, adventurers, oddities...')

// Gets value of 'Scientists' from key 'HKLM\Software\Overwatch'
await Registry.get('HKLM/Software/Overwatch', 'Scientists')

// Creates/rewrites value entry 'hq' with data 'Switzerland' at 'HKLM\Software\Overwatch'
await Registry.set('HKLM/Software/Overwatch', 'hq', 'Switzerland')

// Creates/rewrites value 'Leader' at 'HKLM\Software\Overwatch\Backwatch'
await Registry.set('HKLM/Software/Overwatch/Blackwatch', 'Leader', 'Gabriel Reyes')

// Retrieves the 'leader' value 
// NOTE: case insensitivity
await Registry.get('hklm/software/overwatch/blackwatch', 'leader')
``` 


## <a name="usage.instance"></a>Instance mode

```js
// Creates the instance but does not yet create the Overwatch key if it doesn't exists yet.
// NOTE: both backslashes (\) and forward slashes (/) can be used
var reg = new Registry('HKLM/Software/Overwatch')

// Creates default value inside the key (with data 'Soldiers, scientists, adventurers, oddities...')
await reg.set('', 'Soldiers, scientists, adventurers, oddities...')

// Gets value of 'Scientists' from key 'HKLM\Software\Overwatch'
await reg.get('Scientists')

// Creates/rewrites value entry 'hq' with data 'Switzerland' at 'HKLM\Software\Overwatch'
await reg.set('hq', 'Switzerland')

// Creates/rewrites value 'Leader' at 'HKLM\Software\Overwatch\Backwatch'
await reg.set('/Blackwatch', 'Leader', 'Gabriel Reyes')

// Retrieves the 'leader' value 
// NOTE: case insensitivity
await reg.get('/blackwatch', 'leader')
```

[See *"Constructor, instance mode"* section for more](#instance)


# <a name="options"></a>Options

This section contains info about all possible options. Options is always the last argument (with exceptions for [`.set()` method](#method.set). Check its description for details).

## <a name="options.path"></a>`path`: String

* **Default value**: `undefined`
* **Template**: `<hive>/<path>`
* **Example**: `HKLM/SOFTWARE/Overwatch`

Path is the only value that is required in every method. If method's first argument is a string, it's regarded as `path`.

* Both backslashes (`\`) and forward slashes (`/`) can be used. Note that backslashes should be always escaped (`\\`).
* Path is case insensitive.
* Path should be started with either long or short hive name:

  |Long name|Short name|
  |-|-|
  |`HKEY_LOCAL_MACHINE`|`HKLM`|
  |`HKEY_CURRENT_USER`|`HKCU`|
  |`HKEY_CLASSES_ROOT`|`HKCR`|
  |`HKEY_USERS`|`HKU`|
  |`HKEY_CURRENT_CONFIG`|`HKCC`|


## <a name="options.name"></a>`name`: String

* **Default value**: `undefined`

Value name. If method's second argument is a string, it's regarded as `name`.

<!-- In the [.set()](#method.set) method `name` is regarded as subkey name if `data` is object. -->

* Set `name` to `''` (empty string) to work with [`(Default)` value](#caveats.default-values).
* Name is case insensitive (can be changed with `lowercase` option).


## <a name="options.data"></a>`data`: Any

* **Default value**: `undefined`

Value data. Can be `String`, `Number`, `Array<String>`, `Buffer`, `Uint8Array`, `ArrayBuffer`.  If method's third argument is a string, it's regarded as `data`.

In the [.set()](#method.set) method it also can be `Object` (check [method's description](#method.set) for details).


## <a name="options.type"></a>`type`: String

* **Possible values**: `SZ`, `MULTI_SZ`, `EXPAND_SZ`, `DWORD`, `QWORD`, `BINARY`, `NONE`
* **Default value**: `SZ` (for `.set()` method)

Value type. This option is actual in the [.set() method](#method.set) only.

`REG_` perfix can be ommited, so `REG_DWORD` and `DWORD` are equal.


[See *"Type infering and conversions"* section for more](#caveats.type-infering)


## <a name="options.lowercase"></a>`lowercase`: Boolean

* **Default value**: `true`

`rage-edit` transforms all key paths and value names (not the actual data of value entry) to lowercase by default to prevent confusion. This does not affect input - you can still use all-caps paths and value names with uppercased characters.

Check the [.get() method](#method.get)'s examples section for output examples.

[See *"Case sensitivity"* section for more](#caveats.case-sensitivity)


## <a name="options.format"></a>`format`: String

* **Possible values**: `'simple'`, `'complex'`

* **Default value**: `simple`

Retrieving data from the registry poses a complication. Format of the output cannot be as straight forward as JSONs nested structure because the registry better resembles an XML tree where each node can have both a children nodes and also attributes. A Windows registry key can host subkeys as well as value entries, both of which can have the same names leading to possible collisions.

Due to that `rage-edit` offers two types of output formats: `simple` and `complex`. By default `simple` is enabled globally for all calls.

Check the [.get() method](#method.get)'s examples section for detailed output examples.

Format type can be changed globally:
```js
Registry.format = 'complex'
```


### Simple

Simple output tries to resemble JSON at much as possible while trying to avoid collisions with the names of keys and values.

Key names are properties of the object. The key is represented by (stub of) another object. This is useful when calling `Registry.get()` in recursive mode.

Values are stored in `$values` object of `name:data` pairs, where value name is the property, value data is the content of that property, and type is omitted.

So if your key has a subkey named `version` and also a value named `version`, you will be able to access both of them without collision with `output.version` and `output.$values.version`.

**Warning**: `$values` might be still conflicting since `$` is a valid character in key paths. You can change `$values` to be whatever else by changing `Registry.VALUES`. e.g. `Registry.VALUES = '__$$NO_CONFLICT_VALUES'`

The following snippet serves as an example of how output can be nested, but the `HKLM` hive contains enormous amounts of data and thus is not recommended to be queried recursively.

```js
// Gets default value (empty string) of HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Lock Screen\FeedManager
var software = await Registry.get('HKLM/Software', { recursive: true })
software.microsoft.windows.currentversion['Lock Screen'].feedmanager.$values['']
```


### Complex

Offers comprehensive output and first and foremost contains types of value entries since every value entry is represented by `{name, data, type}` object in a `values` array.

Nesting with this format is much more verbose.

```js
// Gets default value (empty string) of HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Lock Screen\FeedManager
var software = await Registry.get('HKLM/Software', { recursive: true, format: 'complex' })
software.keys.microsoft.keys.windows.keys.currentversion.keys['Lock Screen'].keys.feedmanager.values['']
```


## <a name="options.bits"></a>`bits`: Number

* **Possible values**: `64`, `32`, `null`
* **Default value**: `null`

64-bit version of Windows uses `Wow6432Node` key to present a separate view of some particular keys (mostly it's the `HKEY_LOCAL_MACHINE/SOFTWARE` key) for 32-bit applications that run on a 64-bit version of Windows. In other words, when a 32-bit application queries a value under the `HKLM/SOFTWARE/Example` subkey, the application reads from the `HKLM/SOFTWARE/Wow6432Node/Example` subkey.

64-bit application can get access to both 64-bit and 32-bit registry views, while 32-bit applications stuck inside of `Wow6432Node` subkeys. The `bits` option can be set to `32` or `64` to force access to 64-bit or 32-bit keys:

|Condition|Requested key|Redirected to|
|-|-|-|
|64-bit node.js **OR** `{ bits: 64 }`|HKLM/SOFTWARE/Example|HKLM/SOFTWARE/Example|
|64-bit node.js **OR** `{ bits: 64 }`|HKLM/SOFTWARE/Wow6432Node/Example|HKLM/SOFTWARE/Wow6432Node/Example|
|32-bit node.js **OR** `{ bits: 32 }`|HKLM/SOFTWARE/Example|HKLM/SOFTWARE/Wow6432Node/Example|
|32-bit node.js **OR** `{ bits: 32 }`|HKLM/SOFTWARE/Wow6432Node/Example|HKLM/SOFTWARE/Wow6432Node/Example|

The format also can be changed globally:
```js
// Force 32-bit mode
Registry.bits = 32

// Force 64-bit mode
Registry.bits = 64

// Let Windows decide
Registry.bits = null
```


## <a name="options.unicode"></a>`unicode`: Boolean

* **Default value**: `false`

Node.js does always expect UTF-8 output from a child process, but Windows relies on the default system's [code page](https://ss64.com/nt/chcp.html) (with English locale it is `cp437`, with Russian locale it is `cp866` and so on) which results to rendering non-ASCII characters as `?` or `�`.

A possible workaround is change the console codepage to `65001`. But due to how Windows console works, changed codepage stays changed even after JS code finished its work:

```
C:\>chcp
Active code page: 437

C:\>node yourScriptThatChangesCodepage.js

C:\>chcp
Active code page: 65001
```

That may lead to unexpected results in the future (note that the problem is actual within current console instance only). That's why unicode support can't be enabled by default.

To avoid that, the `unicode` option allows to change the code page to `65001` before reading and restore it right after registry data is retrieved.

```js
await Registry.set('HKLM/SOFTWARE/Example', 'Unicode string', 'Unicode: Коварные закорючки ツ')

-> await Registry.get('HKLM/SOFTWARE/Example', 'Unicode string')
<- 'Unicode: ???????? ????????? ?'

-> await Registry.get('HKLM/SOFTWARE/Example', 'Unicode string', { unicode: true })
<- 'Unicode: Коварные закорючки ツ'
```

That safety slows down performance a bit, but if you're going to read a lot of unicode data from registry, it's possible to temporarily switch `rage-edit` (and concurrently the entire console instance's output) to unicode the following way:

```js
try {
  await Registry.enableUnicode()
  // Doing stuff with registry...
} finally {
  await Registry.disableUnicode()
}
```

**Note**: this problem is actual for reading from registry only. Writing unicode data works with any codepage.


## <a name="options.recursive"></a>`recursive`: Boolean

* **Default value**: `false`

By default, `.get()` calls are not recursive due to performance reasons. This can be changed by setting `recursive` option to `true`.

Check the description of the [.get() method](#method.get) for examples.


## <a name="options.isOptions"></a>`$isOptions`: Boolean

**Note**: Please try to aviod cases where this option could be used.

Allows to explicitly mark object as options object. Is used internally but can also be useful in some edge cases described in the [.set() method](#method.set)'s description.



# <a name="methods"></a>Methods

Every method accepts up to four optional arguments in the following order: `path`, `name`, `data`, `options`. If last argument is object, it's always regarded as options object (`.set()` is an exception, see [$isOptions section](#options.isOptions) above). At least one argument is required. If some of arguments is omitted, it can be specified in options object which means all the following examples do the same thing:

```js
await Registry.get('HKLM/SOFTWARE/Example', 'String')

// Equals to:
await Registry.get('HKLM/SOFTWARE/Example', {
  name: 'String'
})

// Equals to:
await Registry.get({
  path: 'HKLM/SOFTWARE/Example',
  name: 'String'
})
```
```js
await Registry.set('HKLM/SOFTWARE/Example', 'StringVal', 'content', { type: 'REG_SZ' })

// Equals to:
await Registry.set({
  path: 'HKLM/SOFTWARE/Example',
  name: 'StringVal',
  data: 'content',
  type: 'REG_SZ'
})

// Equals to:
// (Warning: this is not recommended way of using .set() and showed for demonstration purposes only!
//  Please stick with one of the ways described above)
await Registry.set('HKLM/SOFTWARE/Example', {
  $isOptions: true, // Explicitly mark object as options object. Check the '$isOptions' section for details.
  name: 'StringVal',
  data: 'content',
  type: 'REG_SZ'
})

// Equals to:
// (Warning: this is not recommended way of using .set() and showed for demonstration purposes only!
//  Please stick with one of the ways described above)
await Registry.set('HKLM/SOFTWARE/Example', 'StringVal', {
  $isOptions: true, // Explicitly mark object as options object. Check the '$isOptions' section for details.
  data: 'content',
  type: 'REG_SZ'
})

// A better alternative for two last examples:
await Registry.set('HKLM/SOFTWARE/Example',
  { StringVal: 'content' }, // Data object
  { type: 'REG_SZ' }        // Options object
)
```

Methods always return [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise):

```js
let str = await Registry.get('HKLM/SOFTWARE/Example', 'String')
console.log(str)

// Equals to:
Registry
  .get('HKLM/SOFTWARE/Example', 'String')
  .then(str => console.log(str))
```

**Note:** the following registry content is used in all example sections:
```
HKEY_LOCAL_MACHINE\SOFTWARE\Example
├── (Default)   REG_SZ      (value not set)
├── StringVal   REG_SZ      content
├── NumberVal   REG_DWORD   0x0000002f(47)
└┬─ Subkey
 ├── (Default)        REG_SZ   Some default value
 └── Another string   REG_SZ   Another value
```


## <a name="method.get"></a>.get([path [, name]][, options])

* Supported options: `path, name, recursive, bits, format, lowercase, unicode`

Retrieves content of `path`. Returned object contains subkeys list and values under the `$values` key. To retrive subkeys content, set `recursive` option to `true`.

If `name` is set, the specified name will be returned. In order to work with `(Default)` value, set `name` to `''` (empty string).

`undefined` is returned if either `path` or `name` doesn't exist.

Read value is automatically converted into matching JS type according with a table from ["Type infering and conversions" section](#caveats.type-infering).


### Examples:

```js
// Getting key structre

-> await Registry.get('HKLM/SOFTWARE/Example')
<- {
    '$values': {
      stringval: 'content',
      numberval: 47 // Name is in lower case because `lowercase` is `true` by default
    },
    subkey: {
      '$values': {} // Empty because `recursive` is `false` by default
    }
  }

-> await Registry.get('HKLM/SOFTWARE/Example', { lowercase: false })
<- {
    '$values': {
      StringVal: 'content',
      NumberVal: 47
    },
    Subkey: {
      '$values': {}
    }
  }

-> await Registry.get('HKLM/SOFTWARE/Example', { recursive: true })
<- {
    '$values': {
      stringval: 'content',
      numberval: 47
    },
    subkey: {
      '$values': {
        '': 'Some default value',
        'another string': 'Another value'
      }
    }
  }

-> await Registry.get('HKLM/SOFTWARE/Example', { format: 'complex' })
<- {
    keys: {
      subkey: {
        keys: {},
        values: []
      }
    },
    values: [
      {
        name: 'stringval',
        type: 'REG_SZ',
        data: 'content'
      },
      {
        name: 'numberval',
        type: 'REG_DWORD',
        data: 47
      }
    ]
  }
```
```js
// Getting value

-> await Registry.get('HKLM/SOFTWARE/Example', 'NumberVal')
<- 47

-> await Registry.get('HKLM/SOFTWARE/Example/Subkey', '')
<- 'Some default value'

-> await Registry.get('HKLM/SOFTWARE/Fake path')
-> await Registry.get('HKLM/SOFTWARE/Example', 'Something that does not exist')
<- undefined
```


## <a name="method.has"></a>.has([path[, name]][, options])


* Supported options: `path, name, bits`

Just like `.get()` but returns boolean depending on existence of the key or value.


### Examples:

```js
-> await Registry.has('HKLM/SOFTWARE/Example')
-> await Registry.has('HKLM/SOFTWARE/Example', 'NumberVal')
-> await Registry.has('HKLM/SOFTWARE/Example', 'numberval')
<- true

-> await Registry.has('HKLM/SOFTWARE/Fake path')
-> await Registry.has('HKLM/SOFTWARE/Example', 'Something that does not exist')
<- false

// Checks 'HKLM\SOFTWARE\Wow6432Node\Example
-> await Registry.has('HKLM/SOFTWARE/Example', { bits: 32 })
<- false
```


## <a name="method.set"></a>.set(...args)

* Supported options: `path, name, data, type, bits`
* Method overloads:
  * .set(`options`: *Object*)
  * .set(`path`: *String*, `complexData`: *Object*)
  * .set(`path`: *String*, `name`: *String*, `data`: *Any*)
  * .set(`path`: *String*, `name`: *String*, `data`: *Any*, `options`: *Object*)

Creates or rewrites a `key` or `name`d value inside a key at the given `path`.

If a key at the path doesn't exist it will be created.

If `type` option is ommited, value type is automatically inferred as described in the [type section](#options.type).

Doesn't return anything.

**Note**: `complexData` is a object (with nested data) that will be turned into a bunch of values and subkeys. In this case the `type` option has no power.

### Examples:

```js
// Create string value (as REG_SZ)
await Registry.set('HKEY_LOCAL_MACHINE/SOFTWARE/Example', 'StringVal', 'content')
// Same as:
await Registry.set({
  path: 'HKEY_LOCAL_MACHINE/SOFTWARE/Example',
  name: 'StringVal',
  data: 'content'
})

// Create dword value (as REG_DWORD)
await Registry.set('HKEY_LOCAL_MACHINE/SOFTWARE/Example', 'NumberVal', 47)

// Explicitly store integer as a string
await Registry.set('HKEY_LOCAL_MACHINE/SOFTWARE/Example', 'NumberVal', 47, { type: 'REG_SZ' })

// Create default value entry
await Registry.set('HKEY_LOCAL_MACHINE/SOFTWARE/Example/Subkey', '', 'Some default value')

// Create array (as REG_MULTI_SZ)
await Registry.set('HKEY_LOCAL_MACHINE/SOFTWARE/Example', 'ArrayVal', ['Item 1', 'Item 2', 'Item 3']),

// Create complex structure based on JS object
await Registry.set('HKEY_LOCAL_MACHINE/SOFTWARE/Example', {
  'StringVal': 'content',
  'NumberVal': 47,
  'Subkey': {
    '': 'Some default value',
    'Another string': 'Another value'
  }
})

// The second argument is regarded as subkey name if 'data' is object. Same as above
await Registry.set('HKEY_LOCAL_MACHINE/SOFTWARE', 'Example', {
  'String': 'text',
  'Number': 47,
  'Subkey': {
    '': 'Some default value',
    'Another string': 'Another value'
  }
})
```
```js
// Edge case: create empty key under the 32-bit registry environment.
// A possible solution is set '$isOptions` option.
await Registry.set('HKEY_LOCAL_MACHINE/SOFTWARE/New key', { bits: 32, $isOptions: true})

// But there's the better way to do the same:
await Registry.set({
  path: 'HKEY_LOCAL_MACHINE/SOFTWARE/New key',
  bits: 32
})
```


## <a name="method.delete"></a>.delete([path[, name]][, options])

Deletes a registry key at the given `path` or deletes a `name`d value entry within this key.

Doesn't return anything.

* Supported options: `path, name, bits`


### Examples:

```js
// Delete value 'NumberVal' in 'HKLM\SOFTWARE\Wow6432Node\Example'
await Registry.delete('HKLM/SOFTWARE/Example', 'NumberVal', { bits: 32 })

// Delete value 'NumberVal' in 'HKLM\SOFTWARE\Example'
await Registry.delete('HKLM/SOFTWARE/Example', 'NumberVal')

// Delete default value in 'HKLM\SOFTWARE\Example'
await Registry.delete('HKLM/SOFTWARE/Example', '')

// Delete key 'HKLM\SOFTWARE\Example' and all of its subkeys and values
await Registry.delete('HKLM/SOFTWARE/Example')
```


# <a name="static"></a>Static properties


## <a name="static.values"></a>`VALUES`

* **Description:** String used for naming values key in [simple mode](#options.format)
* **Default value:** `$values`


## <a name="static.isOptions"></a>`IS_OPTIONS`

* **Description:** String used to represent the [$isOptions](#options.isOptions) key
* **Default value:** `$isOptions`


# <a name="instance"></a>Constructor, instance mode

It's possible to create a new `Registry` instance with some defaults overridden with your own.

In the instance mode every method described in the [methods section](#methods) works just like it's expected to work. The only option that behaves different is `path`. See section below for details.


## <a name="instance.constructor"></a>`new Registry([path,][options])`


### `path`

[Path](#options.path) represents a root path to a key. Can be set through a first argument, or as a `path` option.

If `path` is ommited, every method described in the [methods section](#methods) works just like it's expected to work.

If `path` is set, this option becomes optional in every method. Though if first argument is a string and starts with a slash, it's regarded as a relative path.


### `options`

Object that can contain every option described in the [options section](#options)


## <a name="instance.properties"></a>Instance properties

* **`path`** Full path of current key path.
* **`hive`** Short name of the current hive like `HKCU`
* **`hiveLong`** Long name of the current hive like `HKEY_CURRENT_USER`

**Note**: Those properties are `undefined` is `path` was not specified.


## <a name="instance.examples"></a>Examples

```js
// Work inside of 'HKLM/SOFTWARE/Example' key
let reg = new Registry('HKLM/SOFTWARE/Example')

// Write and read inside of 'HKLM/SOFTWARE/Example'
reg.set('StringVal', 'content')
reg.get('StringVal')

// Write and read inside of 'HKLM/SOFTWARE/Example/Subkey'
reg.set('/Subkey', '', 'Some default value')
reg.get('/Subkey', '')
```
```js
// Change options only
let regStrict = new Registry({ format: 'complex', lowercase: false, recursive: true })

-> await regStrict.get('HKLM/SOFTWARE/Example')
<- {
    keys: {
      Subkey: {
        keys: {},
        values: [
          {
            name: '',
            type: 'REG_SZ',
            data: 'Some default value'
          },
          <...>
        ]
      }
    },
    values: [
      <...>
    ]
  }
```
```js
// Both path and options
let ureg = new Registry('HKLM/SOFTWARE/Example', { unicode: true })

ureg.get('/Subkey', 'Some unicode value')
// Same as:
Registry.get('HKLM/SOFTWARE/Example/Subkey', 'Some unicode value', { unicode: true })

// Options still can be overridden
ureg.get('/Subkey', 'Some normal value', { unicode: false })
```


# <a name="caveats"></a>Caveats, edge cases & the weirdness of Windows registry

Windows registry has its fair share of footguns that you should be aware of. Not to mention the danger of damaging keys and values that are critical for the proper operation of the OS.


### <a name="caveats.reminder"></a>Friendly reminder about HKCR, HKLM, 64-bit and Wow6432Nodes

`HKCR` is a pointer to `HKLM\Software\Classes`. Use it to access all users.

`HKCU` is a pointer to `HKUS\${UserSid}` Use it to access only current user.

Therefore

`HKCU\Software\Classes` is a pointer to `HKUS\${UserSid}\Software\Classes` which is another pointer to `HKUS\${UserSid}_Classes`.

But on on 64-bit it points to subkey `Wow6432Nodes`, so `HKUS\${UserSid}\Software\Classes` is a pointer to `HKUS\${UserSid}_Classes\Wow6432Node` on 64-bit systems.

Example:

|Original key|Pointer to|bit|
|-|-|-|
|`HKCU\Software\Classes\CLSID`|`HKUS\${UserSid}_Classes\CLSID`|32-bit|
|`HKCU\Software\Classes\CLSID`|`HKUS\${UserSid}_Classes\Wow6432Node\CLSID`|64-bit|

More info [here](https://mintywhite.com/vista/hkcr-hkcu-hklm-hku-hkcc-registry-root-keys/) and [here](https://msdn.microsoft.com/en-gb/library/aa384253%28v=VS.85%29.aspx?f=255&MSPPError=-2147217396
)


### <a name="caveats.default-values"></a>Default values

**Every key has a default value (empty string) which is represented as an empty string**. I.e. name of the value entry is empty string `''`. You might also come across it as a `(Default)` in the `regedit` program or in `reg` command. It is by default of type `REG_SZ`.

```js
(await Registry.get(path)).$values[''] // value of the default value at given path
await Registry.get(path, '') // get default value from the path
```

**Default value cannot be deleted**. Attempting to do so (`Registry.delete(path, '')`) will not actually delete the entry, but only its data. Or rather it will set the data to some sort of `undefined` or `null` (can be seen as `(value not set)` in `regedit`), which is unique to the default value.

In this state, the default value returns `undefined` when queried with `get()` it will not be listed in `$values`, despite actually existing - `has()` always returns `true`.

```js
await Registry.delete(path, '')
await Registry.has(path, '') // true - default value always exists
await Registry.get(path, '') // undefined - default value has no data
(await Registry.get(path)).$value // [] - empty array
```

Practical example:
```js
// Creates new key
await Registry.set('HKLM/SOFTWARE/Overwatch')

// Creates or updates default value of type REG_SZ, inside key HKLM\SOFTWARE\Overwatch (also creates the key if it doesn't exists) 
await Registry.set('HKLM/SOFTWARE/Overwatch', '', 'Soldiers, scientists, adventurers, oddities...')

// Creates or updates default value of type REG_EXPAND_SZ, inside key HKLM\SOFTWARE\Overwatch (also creates the key if it doesn't exists)
await Registry.set('HKLM/SOFTWARE/Overwatch', '', 'Soldiers, scientists, adventurers, oddities...', { type: 'REG_EXPAND_SZ' })
```


### <a name="caveats.permissions"></a>Restricted access, administrator permissions

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


### <a name="caveats.error-suppresion"></a>Error suppresion

`rage-edit` deliberately suppresses error `The system was unable to find the specified registry key or value` that is thrown by the `reg` command when a non-existent value or key is queried. Instead the promise is resolve with `undefined`.

All other errors (especially `Access is denied`) are thrown as expected and the promise will be rejected.


### <a name="caveats.case-sensitivity"></a>Case sensitivity

**Windows Registry is case insensitive.** That applies to key paths and value names. But there are some edge cases. `rage-edit` by default transforms all key paths and value names (*not the actual data of value entry*) to lowercase by default to prevent confusion.

This does not affect input - you can still use all-caps paths and value names with uppercased characters.

```js
// Both ways work and return the same value
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
// Globally
Registry.lowercase = false

// Or per request
var key = await Registry.get('HKCR\\.exe', { lowercase: false })
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
    (Default)        REG_SZ    jpegfile
    Content Type     REG_SZ    image/jpeg
    PerceivedType    REG_SZ    image
```

This however could cause performance issues (querying whole key when only single value is needed isn't a good idea) and the insensitive nature of Windows Registry lead `rage-edit` to deliberately lowercase all paths and value names to prevent situations like this:

```js
// rage-edit by default transforms all value names to lower case to prevent having to do this:
var key = await Registry.get('HKLM\\SOFTWARE\\MyApp')
var version = key.$values['VERSION'] || key.$values['Version'] || key.$values['version']
```


### <a name="caveats.type-infering"></a>Type infering and conversions

`rage-edit` automatically picks a registry value type for you, based in the data you're storing, if you don't specify the `type` for yourself.

When you write to registry with the [`type` option](#options.type) ommited, it is inferred from [`data`](#options.data). When you read from registry, data is converted automatically.

|JS type|Registry type|
|-|-|
|`String`|`REG_SZ`, `REG_EXPAND_SZ`|
|`Number`|`REG_DWORD`|
|`BigInt`|`REG_QWORD`|
|`Array<String>`|`REG_MULTI_SZ`|
|`Buffer`, `Uint8Array`, `ArrayBuffer`|`REG_BINARY`|

```js
Registry.set(path, name, '123', { type: 'REG_DWORD' })
Registry.set(path, name, 123)
Registry.get(path, name) // is 123 (Number in both cases)

Registry.set(path, name, 'one\0two\0three', { type: 'REG_MULTI_SZ' })
Registry.set(path, name, ['one', 'two', 'three'])

Registry.set(path, name, 'hello', { type: 'REG_BINARY' })
Registry.set(path, name, Buffer.from('hello'))
```

#### Caveats and workarounds

`reg-edit` does the best on automatic type conversion between JavaScript and windows registry, so in most cases you don't have to care about it. You can safely read data from registry, though not everything is as smooth as had been wished on writing.

##### `Number` and `REG_DWORD`

`Number` is signed 53-bit value:  
`-2^53 + 1 ... 2^53 - 1` or `-9,007,199,254,740,991 ... +9,007,199,254,740,991`

`REG_DWORD` is unsigned 32-bit value:  
`0 ... 2^32 - 1` or `0 ... 4,294,967,295`

So you can't safely write it:
```js
Registry.set(path, name, -1)         // Throws an error
Registry.set(path, name, 0)          // Ok
Registry.set(path, name, 4294967295) // Ok
Registry.set(path, name, 4294967296) // Throws an error
```

A possible workaround:

```js
// Write
await Registry.set(path, name, 4294967296, { type: 'REG_SZ' })

// Read
parseInt(await Registry.get(path, name))
```

##### `BigInt` and `REG_QWORD`

`BigInt` is... big. This type represents an arbitrarily large integer whose value in theory has no upper or lower bounds. 

`QWORD` is unsigned 64-bit value:  
`0 ... 2^64 - 1` or `0 ... 18,446,744,073,709,551,615`

So `BigInt` has the same problem that `Number` has:
```js
Registry.set(path, name, -1n)                   // Throws an error
Registry.set(path, name, 0n)                    // Ok
Registry.set(path, name, 18446744073709551615n) // Ok
Registry.set(path, name, 18446744073709551616n) // Throws an error
```

A possible workaround:

```js
// Write
await Registry.set(path, name, 18446744073709551616n, { type: 'REG_SZ' })

// Read
BigInt(await Registry.get(path, name))
```

**Note**: `REG_QWORD` values are regarded as `BigInt`s if your environment supports them (Node.js v10.4 / Chromium 67), otherwise value in hex `0x` notation is returned. In other words, `REG_QWORD 0x000004d2 (1234)` value is read as `1234n` in Node.js v10.4+ and `'0x4D2'` in Node.js v10.3-.

##### `Array` and `REG_MULTI_SZ`

`REG_MULTI_SZ` is string separated with null character (`\u0000`).  
This type can't have empty strings: if you try to add one using `regedit`, it will say: "Data of type REG_MULTI_SZ cannot contain empty strings".

So arrays can contain only strings and can't have empty entries.

A possible workaround:

```js
var array = [1, 2,  , 4]

// Write (turns empty entries into nulls)
await Registry.set(path, name, JSON.stringify(array))

// Read
JSON.parse(await Registry.get(path, name))
```


## <a name="discussion"></a>Join the discussion

We're at [Discord](https://discord.gg/v2mUmeD) and [Gitter](https://gitter.im/MikeKovarik/rage-edit). Come join us to discuss features, bugs and more.


## <a name="credits"></a>Credits

Made by Mike Kovařík, Mutiny.cz
