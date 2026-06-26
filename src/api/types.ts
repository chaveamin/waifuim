export type WaifuImage = {
  id: number;
  perceptualHash: string;
  extension: string;
  dominantColor: string;
  source: string;
  artists: WaifuArtist[];
  uploaderId: number | null;
  uploadedAt: string;
  isNsfw: boolean;
  isAnimated: boolean;
  width: number;
  height: number;
  byteSize: number;
  url: string;
  tags: WaifuTag[];
  reviewStatus: string;
  favorites: number;
  likedAt: string | null;
  addedToAlbumAt: string | null;
  albums: unknown[];
};

export type WaifuTag = {
  id: number;
  name: string;
  slug: string;
  description: string;
  reviewStatus: string;
  creatorId: number | null;
  imageCount: number;
};

export type WaifuArtist = {
  id: number;
  name: string;
  patreon: string | null;
  pixiv: string | null;
  twitter: string | null;
  deviantArt: string | null;
  reviewStatus: string;
  creatorId: number | null;
  imageCount: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  maxPageSize: number;
  defaultPageSize: number;
};

export type ImageSearchParams = {
  IncludedTags?: string[];
  ExcludedTags?: string[];
  IsNsfw?: "True" | "False" | "All";
  IncludedArtists?: number[];
  Orientation?: "Landscape" | "Portrait" | "Square";
  MinHeight?: number;
  MaxHeight?: number;
  MinWidth?: number;
  MaxWidth?: number;
  MinByteSize?: number;
  MaxByteSize?: number;
  IsAnimated?: boolean;
  OrderBy?: "DATE" | "FAVORITES";
  Page?: number;
  PageSize?: number;
};

export type PublicStats = {
  totalRequests: number;
  totalImages: number;
  totalTags: number;
  totalArtists: number;
};
