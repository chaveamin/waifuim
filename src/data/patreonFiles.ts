export type PatreonFile = {
  artistId: number;
  artistName: string;
  channelUsername?: string;
  channelId?: string;
  messageId?: number;
  fileId?: string;
  title?: string;
  fileName?: string;
};

export const PATREON_FILES: PatreonFile[] = [
  {
    artistId: 1,
    artistName: "Limart",
    channelId: "-1004307035003",
    messageId: 6,
    title: "Limart Collection",
    fileName: "Limart_Collection.zip",
  },
];

export function getPatreonArtists() {
  const artists = new Map<
    number,
    { artistId: number; artistName: string; fileCount: number }
  >();
  for (const file of PATREON_FILES) {
    const existing = artists.get(file.artistId);
    if (existing) {
      existing.fileCount += 1;
    } else {
      artists.set(file.artistId, {
        artistId: file.artistId,
        artistName: file.artistName,
        fileCount: 1,
      });
    }
  }
  return Array.from(artists.values());
}

export function getPatreonFiles(artistId: number) {
  return PATREON_FILES.filter((file) => file.artistId === artistId);
}
