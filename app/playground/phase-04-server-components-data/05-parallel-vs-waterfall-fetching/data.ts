function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function getArtist(): Promise<{ name: string }> {
  return delay(200, { name: 'Radiohead' });
}

export async function getAlbums(): Promise<string[]> {
  return delay(200, ['OK Computer', 'Kid A', 'In Rainbows']);
}
