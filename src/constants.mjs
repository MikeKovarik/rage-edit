export const SZ        = 'REG_SZ'
export const MULTI_SZ  = 'REG_MULTI_SZ'
export const EXPAND_SZ = 'REG_EXPAND_SZ'
export const DWORD     = 'REG_DWORD'
export const QWORD     = 'REG_QWORD'
export const BINARY    = 'REG_BINARY'
export const NONE      = 'REG_NONE'

export const TYPES = [SZ, MULTI_SZ, EXPAND_SZ, DWORD, QWORD, BINARY, NONE]


const HKLM_FULL  = 'HKEY_LOCAL_MACHINE'
const HKCU_FULL  = 'HKEY_CURRENT_USER'
const HKCR_FULL  = 'HKEY_CLASSES_ROOT'
const HKU_FULL   = 'HKEY_USERS'
const HKCC_FULL  = 'HKEY_CURRENT_CONFIG'

const HKLM  = 'HKLM'
const HKCU  = 'HKCU'
const HKCR  = 'HKCR'
const HKU   = 'HKU'
const HKCC  = 'HKCC'

export const HIVES = [HKLM, HKCU, HKCR, HKU, HKCC]


export function shortenKeyPath(path) {
	var index = path.indexOf('\\')
	var firstSection = path.slice(0, index)
	return shortenHive(firstSection) + '\\' + path.slice(index + 1)
}
export function extendKeyPath(path) {
	var index = path.indexOf('\\')
	var firstSection = path.slice(0, index)
	return extendHive(firstSection) + '\\' + path.slice(index + 1)
}


export function shortenHive(hive) {
	switch (hive) {
		case HKLM_FULL: return HKLM
		case HKCU_FULL: return HKCU
		case HKCR_FULL: return HKCR
		case HKU_FULL : return HKU 
		case HKCC_FULL: return HKCC
	}
	return hive
}
export function extendHive(hive) {
	switch (hive) {
		case HKLM: return HKLM_FULL
		case HKCU: return HKCU_FULL
		case HKCR: return HKCR_FULL
		case HKU : return HKU_FULL 
		case HKCC: return HKCC_FULL
	}
	return hive
}