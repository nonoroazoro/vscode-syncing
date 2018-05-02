export interface IGist
{
    comments: number;
    commits_url: string;
    created_at: string;
    description: string;
    files: IGistFile[];
    forks_url: string;
    git_pull_url: string;
    git_push_url: string;
    html_url: string;
    id: string;
    comments_url: string;
    owner: IGistOwner;
    public: boolean;
    truncated: boolean;
    updated_at: string;
    url: string;
    user?: any;
}

export interface IGistFile
{
    content: string;
    filename: string;
    language: string;
    raw_url: string;
    size: number;
    truncated: boolean;
    type: string;
}

export interface IGistOwner
{
    avatar_url: string;
    bio?: string;
    blog: string;
    company: string;
    created_at: string;
    email: string;
    events_url: string;
    followers_url: string;
    followers: number;
    following_url: string;
    following: number;
    gists_url: string;
    gravatar_id: string;
    hireable: boolean;
    html_url: string;
    id: number;
    location?: string;
    login: string;
    name: string;
    organizations_url: string;
    public_gists: number;
    public_repos: number;
    received_events_url: string;
    repos_url: string;
    site_admin: boolean;
    starred_url: string;
    subscriptions_url: string;
    type: string;
    updated_at: string;
    url: string;
}
