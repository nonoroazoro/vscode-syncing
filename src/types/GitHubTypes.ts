/**
 * Represents the GitHub Gist.
 */
export interface IGist
{
    description: string;
    files: IGistFiles;
    history: IGistHistory[];
    id: string;
    owner: IGistUser;
    public: boolean;

    /**
     * The last update time, such as "2019-04-26T01:43:01Z".
     */
    updated_at: string;
}

/**
 * Represents the `files` of the GitHub Gist.
 */
export type IGistFiles = Record<string, IGistFile>;

/**
 * Represents the `file` of GitHub Gist.
 */
export interface IGistFile
{
    content: string;
    filename: string;
}

/**
 * Represents the `user` of the GitHub Gist.
 */
export interface IGistUser
{
    id: number;
    login: string;
}

/**
 * Represents the `history` of the GitHub Gist.
 */
export interface IGistHistory
{
    /**
     * Date string.
     */
    committed_at: string;

    url: string;
    user: IGistUser;
    version: string;
}
