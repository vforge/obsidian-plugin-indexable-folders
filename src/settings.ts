export interface IndexableFoldersSettings {
    blacklistedPrefixes: string;
    statusBarSeparator: string;
    separator: string;
}

export const DEFAULT_SETTINGS: IndexableFoldersSettings = {
    blacklistedPrefixes: 'zz, xx',
    statusBarSeparator: '→',
    separator: '_',
};
