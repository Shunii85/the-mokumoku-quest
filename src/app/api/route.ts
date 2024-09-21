export async function POST(request: Request) {
  const res = await request.json();
  const commits = res.commits as any[];
  const owner = res.repository.owner.name as string;
  const repo = res.repository.name as string;

  const commitPromises = commits.map((commit) =>
    fetchCommitDetails(commit.id, owner, repo)
  );

  try {
    const commitDetails = (await Promise.all(commitPromises)) as any[];
    console.table(commitDetails);
  } catch (error) {
    console.error(error);
  }

  return Response.json({ commitPromises });
}

async function fetchCommitDetails(
  commitId: string,
  owner: string,
  repo: string
) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/${commitId}`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
}
