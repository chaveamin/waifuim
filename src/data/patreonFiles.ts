export type PatreonFile = {
  artistId: number;
  artistName: string;
  channelUsername?: string;
  channelId?: string;
  messageId?: number;
  fileId?: string;
  title?: string;
  fileName?: string;
  artistDescription?: string;
  patreonLink?: string;
  genres?: string[];
  previewImages?: string[];
};

export const PATREON_FILES: PatreonFile[] = [
  {
    artistId: 1,
    artistName: "Limart",
    channelId: "-1004307035003",
    messageId: 6,
    title: "Limart Collection",
    fileName: "Limart_Collection.zip",
    artistDescription:
      "Limart is a 2D artist who makes pinups/art of characters from various franchises.",
    patreonLink: "https://www.patreon.com/LIMART",
    genres: ["2dcg", "parody", "lesbian"],
    previewImages: [
      "https://i.ibb.co/v4XvVPvJ/Limart-1.avif",
      "https://i.ibb.co/fGnnXjKW/Limart-2.avif",
      "https://i.ibb.co/PvGr1JGk/Limart-3.avif",
      "https://i.ibb.co/ZzRDBxFR/Limart-4.avif",
      "https://i.ibb.co/gMKGJrYd/Limart-5.avif",
      "https://i.ibb.co/Pv5QZFJJ/Limart-6.avif",
      "https://i.ibb.co/TBSfPcT5/Limart-7.avif",
    ],
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
