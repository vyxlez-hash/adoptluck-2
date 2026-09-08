export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ verified: false, error: 'Method not allowed.' });
  try {
    const { userId, phrase } = req.body || {};
    if (!userId || typeof phrase !== 'string' || !phrase.trim()) {
      return res.status(400).json({ verified: false, error: 'Missing required parameters.' });
    }
    const response = await fetch(`https://users.roblox.com/v1/users/${encodeURIComponent(userId)}?_=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    if (!response.ok) return res.status(502).json({ verified: false, error: 'Unable to contact Roblox to read your profile bio.' });
    const data = await response.json();
    const bio = String(data.description || '');
    const cleanBio = bio.toLowerCase().replace(/\s+/g, ' ');
    const cleanPhrase = phrase.toLowerCase().replace(/\s+/g, ' ').trim();
    const verified = cleanBio.includes(cleanPhrase);

    let avatar = 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-Png/150/150/AvatarHeadshot/Png/noFilter';
    try {
      const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${data.id}&size=150x150&format=Png&isCircular=false`);
      if (thumbRes.ok) {
        const thumbData = await thumbRes.json();
        if (thumbData?.data?.[0]?.imageUrl) avatar = thumbData.data[0].imageUrl;
      }
    } catch {}

    return res.status(200).json({
      verified,
      currentBio: bio,
      error: verified ? undefined : 'Verification phrase was not found in your Roblox About section.',
      user: verified ? {
        id: `rbx-${data.id}`,
        robloxId: data.id,
        username: data.name,
        displayName: data.displayName || data.name,
        avatar,
      } : undefined,
    });
  } catch (error: any) {
    return res.status(500).json({ verified: false, error: error?.message || 'Server error while checking Roblox profile.' });
  }
}
