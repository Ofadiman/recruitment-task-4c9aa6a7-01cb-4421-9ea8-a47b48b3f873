export const firstOrThrow = <Type>(array: Type[]): Type => {
  const element = array[0]
  if (!element) {
    throw new Error(`Array is empty.`)
  }

  return element
}
