export declare const EXPECTED_FUSES: Readonly<Record<string, boolean>>
export declare const REQUIRED_FILES: readonly string[]
export declare function fuseName(key: string): string
export declare function checkFuses(actual: Readonly<Record<string, boolean>>): string[]
export declare function checkFiles(listed: readonly string[]): string[]
