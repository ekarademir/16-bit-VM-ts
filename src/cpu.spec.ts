import { CPU, Instruction, Register } from "./cpu";
import { createMemory } from "./memory";

describe("CPU", () => {
  it("points to correct accumulator index", () => {
    const memory = createMemory(16);
    const cpu = new CPU(memory);
    expect(cpu.ACCUMULATOR).toEqual(1);
  });

  it("adds two numbers", () => {
    const memory = createMemory(256 * 256);
    const writableBytes = new Uint8Array(memory.buffer);

    const cpu = new CPU(memory);

    let i = 0;

    // mov 0x1234, r1
    // mov 0xabcd, r2
    // add r1, r2
    // mov acc, #0100

    writableBytes[i++] = Instruction.MOV_LIT_REG;
    writableBytes[i++] = 0x12; // 0x1234
    writableBytes[i++] = 0x34;
    writableBytes[i++] = cpu.REGISTER1;

    writableBytes[i++] = Instruction.MOV_LIT_REG;
    writableBytes[i++] = 0xab; // 0xABCD
    writableBytes[i++] = 0xcd;
    writableBytes[i++] = cpu.REGISTER2;

    writableBytes[i++] = Instruction.ADD_REG_REG;
    writableBytes[i++] = cpu.REGISTER1;
    writableBytes[i++] = cpu.REGISTER2;

    writableBytes[i++] = Instruction.MOV_REG_MEM;
    writableBytes[i++] = cpu.ACCUMULATOR;
    writableBytes[i++] = 0x01; // 0x0100
    writableBytes[i++] = 0x00;

    cpu.stepXTimes(5);

    expect(cpu.peekRegister(Register.ACCUMULATOR)).toEqual(0xbe01);
    expect(memory.getWord(0x0100)).toEqual(0xbe01);
  });

  it("counts to three", () => {
    const memory = createMemory(256 * 256);
    const writableBytes = new Uint8Array(memory.buffer);

    const cpu = new CPU(memory);

    let i = 0;

    // start:
    //   mov #0x0100, r1
    //   mov 0x0001, r2
    //   add r1, r2
    //   mov acc, #0100
    //   jne 0x0003, start:

    writableBytes[i++] = Instruction.MOV_MEM_REG;
    writableBytes[i++] = 0x01; // 0x1234
    writableBytes[i++] = 0x00;
    writableBytes[i++] = cpu.REGISTER1;

    writableBytes[i++] = Instruction.MOV_LIT_REG;
    writableBytes[i++] = 0x00; // 0x0001
    writableBytes[i++] = 0x01;
    writableBytes[i++] = cpu.REGISTER2;

    writableBytes[i++] = Instruction.ADD_REG_REG;
    writableBytes[i++] = cpu.REGISTER1;
    writableBytes[i++] = cpu.REGISTER2;

    writableBytes[i++] = Instruction.MOV_REG_MEM;
    writableBytes[i++] = cpu.ACCUMULATOR;
    writableBytes[i++] = 0x01; // 0x0100
    writableBytes[i++] = 0x00;

    writableBytes[i++] = Instruction.JMP_NOT_EQ;
    writableBytes[i++] = 0x00; // 0x0003
    writableBytes[i++] = 0x03;
    writableBytes[i++] = 0x00; // 0x0000
    writableBytes[i++] = 0x00;

    cpu.stepXTimes(15);

    expect(cpu.peekRegister(Register.ACCUMULATOR)).toEqual(0x0003);
    expect(memory.getWord(0x0100)).toEqual(0x0003);
  });
});
