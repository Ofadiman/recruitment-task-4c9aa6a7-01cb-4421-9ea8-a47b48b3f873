class S3MetadataAdapter {
  public serialize(metadata: object): string {
    return JSON.stringify(metadata)
  }

  public deserialize<Type>(metadataString: string): Type {
    return JSON.parse(metadataString) as Type
  }
}

export const s3MetadataAdapter = new S3MetadataAdapter()
