// See https://stackoverflow.com/questions/41462729/typescript-react-could-not-find-a-declaration-file-for-module-react-material/41631658#41631658
declare module "junk" {
    /**
     * Returns `true` if `filename` matches a junk file.
     */
    export function is(filename: string): boolean;

    /**
     * Returns `true` if `filename` doesn't match a junk file.
     */
    export function not(filename: string): boolean;
}
