/// <reference types="vite/client" />

declare global {
  interface Window {
    Tesseract: {
      recognize(
        image: HTMLCanvasElement | HTMLImageElement | File | Blob | string,
        lang?: string,
      ): Promise<{ data: { text: string } }>
    }
  }
}

export {}
