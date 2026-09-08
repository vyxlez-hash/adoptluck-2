export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const username = typeof req.query.username === 'string' ? req.query.username.trim() : '';
    const userIdParam = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
    let userId: number | null = null;
    let targetUsername = username;

    if (userIdParam) userId = Number.parseInt(userIdParam, 10);
    else if (targetUsername) {
      const lookupRes = await fetch('https://users.roblox.com/v1/usernames/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: [targetUsername], excludeBannedUsers: false }),
      });
      if (!lookupRes.ok) return res.status(502).json({ error: 'Failed to connect to Roblox user registry.' });
      const lookupData = await lookupRes.json();
      if (!lookupData?.data?.length) return res.status(404).json({ error: `Roblox user "${targetUsername}" does not exist. Check spelling.` });
      userId = lookupData.data[0].id;
      targetUsername = lookupData.data[0].name;
    } else return res.status(400).json({ error: 'Please provide a Roblox username.' });

    if (!userId || Number.isNaN(userId)) return res.status(400).json({ error: 'Invalid Roblox user identifier.' });
    const userRes = await fetch(`https://users.roblox.com/v1/users/${userId}`);
    if (!userRes.ok) return res.status(502).json({ error: 'Unable to retrieve Roblox profile details.' });
    const userData = await userRes.json();

    let avatar = 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-Png/150/150/AvatarHeadshot/Png/noFilter';
    try {
      const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
      if (thumbRes.ok) {
        const thumbData = await thumbRes.json();
        if (thumbData?.data?.[0]?.imageUrl) avatar = thumbData.data[0].imageUrl;
      }
    } catch {}

    return res.status(200).json({
      success: true,
      user: {
        id: userData.id,
        username: userData.name,
        displayName: userData.displayName || userData.name,
        description: userData.description || '',
        created: userData.created,
        isBanned: !!userData.isBanned,
        avatar,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Internal error resolving Roblox user.' });
  }
}
