/**
 * Represents the GitHub Gist.
 */
export interface IGist
{
    created_at: string;
    description: string;
    files: IGistFiles;
    history: IGistHistory[];
    id: string;
    owner: IGistOwner;
    public: boolean;
    truncated: boolean;

    /**
     * The last update time, such as "2019-04-26T01:43:01Z".
     */
    updated_at: string;

    url: string;
}

/**
 * Represents the `files` of the GitHub Gist.
 */
export interface IGistFiles
{
    [key: string]: IGistFile;
}

/**
 * Represents the `file` of GitHub Gist.
 */
export interface IGistFile
{
    content: string;
    filename: string;
    language: string;
    size: number;
    truncated: boolean;
    type: string;
}

/**
 * Represents the `owner` of the GitHub Gist.
 */
export interface IGistOwner
{
    id: number;
    login: string;
    type: string;
}

/**
 * Represents the `history` of the GitHub Gist.
 */
export interface IGistHistory
{
    committed_at: string;
    user: IGistOwner;
    version: string;
}
