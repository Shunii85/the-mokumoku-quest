const WEBHOOK_URL =
  "https://discord.com/api/webhooks/1287022195998195825/MHpni3NvQox3jN9EUI3sYocAldc7KEC_iUM7N3ohID1k4qqUS_Zi2WwvMVe0OYmLwXP5";

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
    await sendDiscord(WEBHOOK_URL, JSON.stringify(commitDetails));
  } catch (error) {
    return new Response(`${error}`, { status: 500 });
  }

  return new Response("OK", { status: 200 });
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

async function sendDiscord(url: string | undefined, content: string) {
  if (!url) throw new Error("Discord webhook URL is not provided");

  const data = {
    username: "GitHub",
    avatar_url:
      "https://play-lh.googleusercontent.com/s6_2YQD5GewqFv7zyvDhTpg9TLl96A-sNy_GVqGS-Ukdkfzc_ZCK2dFtgrzm8e43-g",
    content,
  };

  const headers = { "Content-Type": "application/json" };
  const body = JSON.stringify(data);

  const { ok } = await fetch(url, { method: "POST", headers, body });

  if (!ok) throw new Error("Failed to send message to Discord\n");
}
