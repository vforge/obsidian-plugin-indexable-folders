export interface IndexableFoldersSettings {
    specialPrefixes: string;
    statusBarSeparator: string;
    separator: string;
    debugEnabled: boolean;
    statusBarEnabled: boolean;
    labelBackgroundColor: string;
    labelTextColor: string;
}

export const DEFAULT_SETTINGS: IndexableFoldersSettings = {
    specialPrefixes: 'zz, xx',
    statusBarSeparator: '→',
    separator: '_',
    debugEnabled: false,
    statusBarEnabled: true,
    labelBackgroundColor: 'var(--interactive-accent)',
    labelTextColor: 'var(--text-on-accent)',
};
