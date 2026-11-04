declare module 'jsqr' {
  export type Point = { x: number; y: number }

  export type QRCode = {
    binaryData: number[]
    data: string
    location: {
      topRightCorner: Point
      topLeftCorner: Point
      bottomRightCorner: Point
      bottomLeftCorner: Point
      topRightFinderPattern: Point
      topLeftFinderPattern: Point
      bottomLeftFinderPattern: Point
      bottomRightAlignmentPattern?: Point
    }
  }

  export default function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' },
  ): QRCode | null
}
