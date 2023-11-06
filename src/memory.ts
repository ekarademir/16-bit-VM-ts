export const createMemory = (sizeInBytes: number): Memory => {
  // `ArrayBuffer` allocates contiguous buffer with given size
  const buffer = new ArrayBuffer(sizeInBytes);
  const view = new Memory(buffer);

  return view;
};

export class Memory extends DataView {
  public getByte(offset: number): number {
    return this.getUint8(offset);
  }
  public getWord(offset: number): number {
    return this.getUint16(offset);
  }
  public setWord(offset: number, value: number): void {
    return this.setUint16(offset, value);
  }
}
