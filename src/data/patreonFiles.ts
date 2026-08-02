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
      "https://i.ibb.co/sdn3TGvH/limart-1.jpg",
      "https://i.ibb.co/KckxTF11/limart-3.jpg",
      "https://i.ibb.co/MXLPC14/limart-4.jpg",
      "https://i.ibb.co/PZ7wb4PN/limart-5.jpg",
      "https://i.ibb.co/xctGddY/limart-6.jpg",
      "https://i.ibb.co/ZRqgWFfj/limart-7.jpg",
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
