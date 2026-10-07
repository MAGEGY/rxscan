export interface Medicine {
  id: number
  genericName: string
  brandName: string
  price: number
  composition: string
}

export interface OcrLine {
  id: string
  text: string
  isEdited: boolean
}
