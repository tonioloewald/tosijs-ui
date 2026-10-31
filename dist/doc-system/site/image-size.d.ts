export interface ImageSize {
    width: number;
    height: number;
}
/** Size from the image's leading bytes; undefined when the format is not one of the four. */
export declare function imageSizeFromBytes(b: Uint8Array): ImageSize | undefined;
/** Size of the image file at `file`, reading at most its first 64KB. */
export declare function imageSize(file: string): ImageSize | undefined;
