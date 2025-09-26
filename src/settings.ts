export interface IndexableFoldersSettings {
    specialPrefixes: string;
    statusBarSeparator: string;
    separator: string;
    debugEnabled: boolean;
}

export const DEFAULT_SETTINGS: IndexableFoldersSettings = {
    specialPrefixes: 'zz, xx',
    statusBarSeparator: '→',
    separator: '_',
    debugEnabled: false,
};
