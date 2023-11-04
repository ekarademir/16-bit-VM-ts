import { Memory, createMemory } from "./memory";

export class CPU {
  private memory: Memory;
  private registers: Memory;
  private registerNames: Register[];
  private registerMap: Map<Register, number>;

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
    ];

    this.registers = createMemory(this.registerNames.length * 2);

    this.registerMap = this.registerNames.reduce((map, name, i) => {
      map.set(name, i * 2);
      return map;
    }, new Map());
  }

  public debug() {
    this.registerNames.forEach((name) => {
      console.log(
        `${name}: 0x${this.getRegister(name).toString(16).padStart(4, "0")}`
      );
    });
    console.log();
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

  private fetch(): number {
    const nextInstructionAddress = this.getRegister(
      Register.INSTRUCTION_POINTER
    );
    const instruction = this.memory.getByte(nextInstructionAddress);
    this.setRegister(Register.INSTRUCTION_POINTER, nextInstructionAddress + 1);
    return instruction;
  }

  private fetch16(): number {
    const nextInstructionAddress = this.getRegister(
      Register.INSTRUCTION_POINTER
    );
    const instruction = this.memory.getWord(nextInstructionAddress);
    this.setRegister(Register.INSTRUCTION_POINTER, nextInstructionAddress + 2);
    return instruction;
  }

  private execute(instruction): void {
    switch (instruction) {
      // Move literal into the r1 register
      case Instruction.MOV_LIT_R1:
        {
          const literal = this.fetch16();
          this.setRegister(Register.REGISTER1, literal);
        }
        return;
      // Move literal into the r2 register
      case Instruction.MOV_LIT_R2:
        {
          const literal = this.fetch16();
          this.setRegister(Register.REGISTER2, literal);
        }
        return;
      case Instruction.ADD_REG_REG:
        {
          const r1 = this.fetch();
          const r2 = this.fetch();
          const registerValue1 = this.registers.getWord(r1 * 2);
          const registerValue2 = this.registers.getWord(r2 * 2);

          this.setRegister(
            Register.ACCUMULATOR,
            registerValue1 + registerValue2
          );
        }
        return;
    }
  }

  public step() {
    const instruction = this.fetch();
    return this.execute(instruction);
  }
}

export class WrongRegisterError extends Error {}

export enum Register {
  INSTRUCTION_POINTER = "ip",
  ACCUMULATOR = "acc",
  REGISTER1 = "r1",
  REGISTER2 = "r2",
  REGISTER3 = "r3",
  REGISTER4 = "r4",
  REGISTER5 = "r5",
  REGISTER6 = "r6",
  REGISTER7 = "r7",
  REGISTER8 = "r8",
}

export enum Instruction {
  MOV_LIT_R1 = 0x10, // MOV
  MOV_LIT_R2 = 0x11, // MOV
  ADD_REG_REG = 0x12, // ADD
}
