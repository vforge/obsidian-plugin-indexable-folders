export interface IndexableFoldersSettings {
    blacklistedPrefixes: string;
    statusBarSeparator: string;
}

export const DEFAULT_SETTINGS: IndexableFoldersSettings = {
    blacklistedPrefixes: 'zz, xx',
    statusBarSeparator: '→'
};
