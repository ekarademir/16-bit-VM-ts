import { Memory, createMemory } from "./memory";

export class CPU {
  private memory: Memory;
  private registers: Memory;
  private registerNames: Register[];
  private registerIndices: Map<Register, number>;
  private registerMap: Map<Register, number>;
  private stackFrameSize: number;

  public constructor(memory: Memory) {
    this.memory = memory;
    this.registerNames = [
      Register.INSTRUCTION_POINTER,
      Register.ACCUMULATOR,
      Register.REGISTER1,
      Register.REGISTER2,
      Register.REGISTER3,
      Register.REGISTER4,
      Register.REGISTER5,
      Register.REGISTER6,
      Register.REGISTER7,
      Register.REGISTER8,
      Register.STACK_POINTER,
      Register.FRAME_POINTER,
    ];

    // Since 16bits is 2 bytes, size of register buffer is
    // number of registers x 2.
    this.registers = createMemory(this.registerNames.length * 2);

    this.registerIndices = new Map();
    this.registerMap = this.registerNames.reduce((map, name, i) => {
      map.set(name, i * 2);
      this.registerIndices.set(name, i);
      return map;
    }, new Map());

    // Start the stack from the end of the memory
    this.setRegister(Register.STACK_POINTER, this.memory.byteLength - 1 - 1);
    this.setRegister(Register.FRAME_POINTER, this.memory.byteLength - 1 - 1);
    this.stackFrameSize = 0;
  }

  public debug() {
    this.registerNames.forEach((name) => {
      console.log(
        `${name}: 0x${this.getRegister(name).toString(16).padStart(4, "0")}`
      );
    });
    console.log();
  }

  public stepXTimes(x: number) {
    Array.from({ length: x }).forEach(() => {
      this.step();
    });
  }

  public peekRegister(name: Register) {
    return this.getRegister(name);
  }

  public peek(address: number) {
    return this.memory.getWord(address);
  }

  public get instructionPointer() {
    return this.getRegister(Register.INSTRUCTION_POINTER);
  }

  public get stackPointer() {
    return this.getRegister(Register.STACK_POINTER);
  }

  public viewMemoryAt(address: number) {
    // 0x0F01: 0x04 0x05 0xA3 0xFE 0x13 0x0D 0x44 0x0F
    const nextEightBytes = Array.from({ length: 8 }, (_, i) =>
      this.memory.getByte(address + i)
    ).map((v) => `0x${v.toString(16).padStart(2, "0")}`);

    return `0x${address.toString(16).padStart(4, "0")}: ${nextEightBytes.join(
      " "
    )}`;
  }

  public viewStack() {
    const address = this.stackPointer;
    const stackLength = this.memory.byteLength - address;
    const nextEightBytes = Array.from({ length: stackLength }, (_, i) =>
      this.memory.getByte(address + i)
    ).map((v) => `0x${v.toString(16).padStart(2, "0")}`);

    return `0x${address.toString(16).padStart(4, "0")}: ${nextEightBytes.join(
      " "
    )}`;
  }

  private getRegister(name: Register): number {
    if (!this.registerMap.has(name))
      throw new WrongRegisterError(`Register ${name} does not exist`);

    return this.registers.getWord(this.registerMap.get(name));
  }

  private setRegister(name: Register, value: number): void {
    if (!this.registerMap.has(name))
      throw new WrongRegisterError(`Register ${name} does not exist`);

    return this.registers.setWord(this.registerMap.get(name), value);
  }

  private fetchRegisterIndex(): Register {
    const addr = this.fetch();
    return this.registerNames[addr % this.registerNames.length];
  }

  /**
   * Read 8 bit data from the "tape"
   * @returns fetched 8 bit data
   */
  private fetch(): number {
    const nextInstructionAddress = this.getRegister(
      Register.INSTRUCTION_POINTER
    );
    const instruction = this.memory.getByte(nextInstructionAddress);
    this.setRegister(Register.INSTRUCTION_POINTER, nextInstructionAddress + 1);
    return instruction;
  }

  /**
   * Read 16 bit data from the "tape"
   * @returns fetched 16 bit data
   */
  private fetch16(): number {
    const nextInstructionAddress = this.getRegister(
      Register.INSTRUCTION_POINTER
    );
    const instruction = this.memory.getWord(nextInstructionAddress);
    this.setRegister(Register.INSTRUCTION_POINTER, nextInstructionAddress + 2);
    return instruction;
  }

  private push(value: number) {
    const spAddress = this.getRegister(Register.STACK_POINTER);
    this.memory.setWord(spAddress, value);
    // 2 because we move 16 bits, - because stack grows up.
    this.setRegister(Register.STACK_POINTER, spAddress - 2);
    this.stackFrameSize += 2;
  }

  private pop() {
    // 2 because we move 16 bits, + because stack shrinks down.
    const nextSpAddress = this.getRegister(Register.STACK_POINTER) + 2;
    this.stackFrameSize -= 2;
    this.setRegister(Register.STACK_POINTER, nextSpAddress);

    return this.memory.getWord(nextSpAddress);
  }

  private pushState() {
    // Save all general purpose stack pointers to stack
    this.push(this.getRegister(Register.REGISTER1));
    this.push(this.getRegister(Register.REGISTER2));
    this.push(this.getRegister(Register.REGISTER3));
    this.push(this.getRegister(Register.REGISTER4));
    this.push(this.getRegister(Register.REGISTER5));
    this.push(this.getRegister(Register.REGISTER6));
    this.push(this.getRegister(Register.REGISTER7));
    this.push(this.getRegister(Register.REGISTER8));
    // Save the instruction pointer, will be return address
    this.push(this.getRegister(Register.INSTRUCTION_POINTER));
    // Save the stack frame size, add the extra 2 for
    // this operation, since stackFrameSize won't be updated
    // before the call.
    this.push(this.stackFrameSize + 2);

    // Point the frame pointer to the current state of the stack pointer
    this.setRegister(
      Register.FRAME_POINTER,
      this.getRegister(Register.STACK_POINTER)
    );
    // Reset stack size for further calls
    this.stackFrameSize = 0;
  }

  private popState() {
    // Point the stack pointer back to where it was
    const stackPointerAddress = this.getRegister(Register.FRAME_POINTER);
    this.setRegister(Register.STACK_POINTER, stackPointerAddress);

    // Get the saved stack size to calculate new frame pointer
    const frameSize = this.pop();

    // Reset the stack frame size
    this.stackFrameSize = frameSize;

    // Get the return address
    this.setRegister(Register.INSTRUCTION_POINTER, this.pop());

    // Load the CPU state
    this.setRegister(Register.REGISTER8, this.pop());
    this.setRegister(Register.REGISTER7, this.pop());
    this.setRegister(Register.REGISTER6, this.pop());
    this.setRegister(Register.REGISTER5, this.pop());
    this.setRegister(Register.REGISTER4, this.pop());
    this.setRegister(Register.REGISTER3, this.pop());
    this.setRegister(Register.REGISTER2, this.pop());
    this.setRegister(Register.REGISTER1, this.pop());

    // Pop out argument list
    const nArgs = this.pop();
    for (let i = 0; i < nArgs; i++) {
      this.pop();
    }

    // Set the frame pointer
    const framePointerAddress = stackPointerAddress + frameSize;
    this.setRegister(Register.FRAME_POINTER, framePointerAddress);
  }

  private execute(instruction): void {
    switch (instruction) {
      case Instruction.MOV_LIT_REG: {
        const literal = this.fetch16();
        const register = this.fetchRegisterIndex();
        this.setRegister(register, literal);
        return;
      }
      case Instruction.MOV_REG_REG: {
        const registerFrom = this.fetchRegisterIndex();
        const registerTo = this.fetchRegisterIndex();
        const value = this.getRegister(registerFrom);
        this.setRegister(registerTo, value);
        return;
      }
      case Instruction.MOV_REG_MEM: {
        const registerFrom = this.fetchRegisterIndex();
        const address = this.fetch16();
        const value = this.getRegister(registerFrom);
        this.memory.setWord(address, value);
        return;
      }
      case Instruction.MOV_MEM_REG: {
        const address = this.fetch16();
        const registerTo = this.fetchRegisterIndex();
        const value = this.memory.getWord(address);
        this.setRegister(registerTo, value);
        return;
      }
      case Instruction.ADD_REG_REG: {
        // Indices of registers
        const r1 = this.fetch();
        const r2 = this.fetch();
        // Index x 2, is the byte offset in register buffer
        const registerValue1 = this.registers.getWord(r1 * 2);
        const registerValue2 = this.registers.getWord(r2 * 2);

        this.setRegister(Register.ACCUMULATOR, registerValue1 + registerValue2);
        return;
      }
      case Instruction.JMP_NOT_EQ: {
        const value = this.fetch16();
        const address = this.fetch16();

        const accValue = this.getRegister(Register.ACCUMULATOR);

        if (value !== accValue) {
          this.setRegister(Register.INSTRUCTION_POINTER, address);
        }
        return;
      }
      case Instruction.PUSH_LIT: {
        const value = this.fetch16();
        this.push(value);
        return;
      }
      case Instruction.PUSH_REG: {
        const registerIndex = this.fetchRegisterIndex();
        this.push(this.getRegister(registerIndex));
        return;
      }
      case Instruction.POP: {
        const registerIndex = this.fetchRegisterIndex();
        const value = this.pop();

        this.setRegister(registerIndex, value);
        return;
      }
      case Instruction.CAL_LIT: {
        const address = this.fetch16();
        this.pushState();
        this.setRegister(Register.INSTRUCTION_POINTER, address);
        return;
      }
      case Instruction.CAL_REG: {
        const registerIndex = this.fetchRegisterIndex();
        const address = this.getRegister(registerIndex);
        this.pushState();
        this.setRegister(Register.INSTRUCTION_POINTER, address);
        return;
      }
      case Instruction.RET: {
        this.popState();
        return;
      }
    }
  }

  public step() {
    const instruction = this.fetch();
    return this.execute(instruction);
  }

  public get INSTRUCTION_POINTER() {
    return this.registerIndices.get(Register.INSTRUCTION_POINTER);
  }

  public get ACCUMULATOR() {
    return this.registerIndices.get(Register.ACCUMULATOR);
  }
  public get REGISTER1() {
    return this.registerIndices.get(Register.REGISTER1);
  }
  public get REGISTER2() {
    return this.registerIndices.get(Register.REGISTER2);
  }
  public get REGISTER3() {
    return this.registerIndices.get(Register.REGISTER3);
  }
  public get REGISTER4() {
    return this.registerIndices.get(Register.REGISTER4);
  }
  public get REGISTER5() {
    return this.registerIndices.get(Register.REGISTER5);
  }
  public get REGISTER6() {
    return this.registerIndices.get(Register.REGISTER6);
  }
  public get REGISTER7() {
    return this.registerIndices.get(Register.REGISTER7);
  }
  public get REGISTER8() {
    return this.registerIndices.get(Register.REGISTER8);
  }
  public get STACK_POINTER() {
    return this.registerIndices.get(Register.STACK_POINTER);
  }
  public get FRAMEPOINTER() {
    return this.registerIndices.get(Register.FRAME_POINTER);
  }
}

export class WrongRegisterError extends Error {}

export enum Register {
  INSTRUCTION_POINTER = "ip", // Where in the "tape" are we
  ACCUMULATOR = "acc", // Bank on which data is piled
  REGISTER1 = "r1",
  REGISTER2 = "r2",
  REGISTER3 = "r3",
  REGISTER4 = "r4",
  REGISTER5 = "r5",
  REGISTER6 = "r6",
  REGISTER7 = "r7",
  REGISTER8 = "r8",
  STACK_POINTER = "sp",
  FRAME_POINTER = "fp",
}

export enum Instruction {
  MOV_LIT_REG = 0x10, // Move literal to register
  MOV_REG_REG = 0x11, // Move register to register
  MOV_REG_MEM = 0x12, // Move register to memory
  MOV_MEM_REG = 0x13, // Move memory to register
  ADD_REG_REG = 0x14, // Add register to register
  JMP_NOT_EQ = 0x15, // Jump not equal, if literal is not equal to accumulator value, jump to the address
  PUSH_LIT = 0x17, // Push given literal to the stack
  PUSH_REG = 0x18, // Push given register to the stack
  POP = 0x1a, // Pop value from the stack to the givne register
  CAL_LIT = 0x5e, // Call to a pointer, pointed by a literal
  CAL_REG = 0x5f, // Call to a pointer, pointed by a register
  RET = 0x60, // Return from subroutine
}
