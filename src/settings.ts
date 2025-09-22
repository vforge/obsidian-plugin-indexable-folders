export interface IndexableFoldersSettings {
    blacklistedPrefixes: string;
}

export const DEFAULT_SETTINGS: IndexableFoldersSettings = {
    blacklistedPrefixes: 'zz, xx'
};
