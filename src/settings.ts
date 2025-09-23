export interface IndexableFoldersSettings {
    specialPrefixes: string;
    statusBarSeparator: string;
    separator: string;
}

export const DEFAULT_SETTINGS: IndexableFoldersSettings = {
    specialPrefixes: 'zz, xx',
    statusBarSeparator: '→',
    separator: '_',
};
