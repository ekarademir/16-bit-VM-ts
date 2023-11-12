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

  it("swaps two numbers", () => {
    const memory = createMemory(256 * 256);
    const writableBytes = new Uint8Array(memory.buffer);

    const cpu = new CPU(memory);

    let i = 0;

    // mov 0x5151, r1
    // mov 0x4242, r2
    //
    // psh r1
    // psh r2
    //
    // pop r1
    // pop r2

    writableBytes[i++] = Instruction.MOV_LIT_REG;
    writableBytes[i++] = 0x51; // 0x5151
    writableBytes[i++] = 0x51;
    writableBytes[i++] = cpu.REGISTER1;

    writableBytes[i++] = Instruction.MOV_LIT_REG;
    writableBytes[i++] = 0x42; // 0x4242
    writableBytes[i++] = 0x42;
    writableBytes[i++] = cpu.REGISTER2;

    writableBytes[i++] = Instruction.PUSH_REG;
    writableBytes[i++] = cpu.REGISTER1;
    writableBytes[i++] = Instruction.PUSH_REG;
    writableBytes[i++] = cpu.REGISTER2;

    writableBytes[i++] = Instruction.POP;
    writableBytes[i++] = cpu.REGISTER1;
    writableBytes[i++] = Instruction.POP;
    writableBytes[i++] = cpu.REGISTER2;

    cpu.stepXTimes(15);

    expect(cpu.peekRegister(Register.REGISTER1)).toEqual(0x4242);
    expect(cpu.peekRegister(Register.REGISTER2)).toEqual(0x5151);
  });

  it("saves cpu state before calling a subroutine", () => {
    const memory = createMemory(256 * 256);
    const writableBytes = new Uint8Array(memory.buffer);

    const cpu = new CPU(memory);

    let i = 0;

    // mov 0x5151, r1
    // mov 0x4242, r2
    //
    // cal my_subroutine:
    //
    // ;; 0x3000
    // my_subroutine:
    //  ;; no return

    const subRoutineAddress = 0x3000;

    writableBytes[i++] = Instruction.MOV_LIT_REG;
    writableBytes[i++] = 0x51;
    writableBytes[i++] = 0x51;
    writableBytes[i++] = cpu.REGISTER1;

    writableBytes[i++] = Instruction.MOV_LIT_REG;
    writableBytes[i++] = 0x42;
    writableBytes[i++] = 0x42;
    writableBytes[i++] = cpu.REGISTER8;

    writableBytes[i++] = Instruction.CAL_LIT;
    writableBytes[i++] = (subRoutineAddress & 0xff00) >> 8;
    writableBytes[i++] = subRoutineAddress & 0x00ff;

    cpu.stepXTimes(15);

    expect(cpu.peek(cpu.stackPointer + 1 * 2)).toEqual(0x0014);
    expect(cpu.peek(cpu.stackPointer + 3 * 2)).toEqual(0x4242);
    expect(cpu.peek(cpu.stackPointer + 10 * 2)).toEqual(0x5151);
    expect(cpu.peekRegister(Register.FRAME_POINTER)).toEqual(
      cpu.peekRegister(Register.STACK_POINTER)
    );
  });

  it("loads back the cpu state after return", () => {
    const memory = createMemory(256 * 256);
    const writableBytes = new Uint8Array(memory.buffer);

    const cpu = new CPU(memory);

    let i = 0;

    // psh 0x1111
    // psh 0x2222
    // psh 0x3333
    //
    // mov 0x1234, r1
    // mov 0x5678, r4
    //
    // psh 0x0000   ;; number of arguments for this subroutine
    // cal my_subroutine:
    // psh 0x4444
    //
    // ;; at address 0x3000
    // my_subroutine:
    //  psh 0x0102
    //  psh 0x0304
    //  psh 0x0506
    //
    //  mov 0x0708, r1
    //  mov 0x0809, r8
    //  ret

    const subRoutineAddress = 0x3000;

    writableBytes[i++] = Instruction.PUSH_LIT;
    writableBytes[i++] = 0x11; // 0x1111
    writableBytes[i++] = 0x11;

    writableBytes[i++] = Instruction.PUSH_LIT;
    writableBytes[i++] = 0x22; // 0x2222
    writableBytes[i++] = 0x22;

    writableBytes[i++] = Instruction.PUSH_LIT;
    writableBytes[i++] = 0x33; // 0x3333
    writableBytes[i++] = 0x33;

    writableBytes[i++] = Instruction.MOV_LIT_REG;
    writableBytes[i++] = 0x12; // 0x1234
    writableBytes[i++] = 0x34;
    writableBytes[i++] = cpu.REGISTER1;

    writableBytes[i++] = Instruction.MOV_LIT_REG;
    writableBytes[i++] = 0x56; // 0x5678
    writableBytes[i++] = 0x78;
    writableBytes[i++] = cpu.REGISTER4;

    writableBytes[i++] = Instruction.PUSH_LIT;
    writableBytes[i++] = 0x00; // 0x0000
    writableBytes[i++] = 0x00;

    writableBytes[i++] = Instruction.CAL_LIT;
    writableBytes[i++] = (subRoutineAddress & 0xff00) >> 8; // Mask first two bits and shift third position from the right, 2^3;
    writableBytes[i++] = subRoutineAddress & 0x00ff;

    writableBytes[i++] = Instruction.PUSH_LIT;
    writableBytes[i++] = 0x44; // 0x4444
    writableBytes[i++] = 0x44;

    i = subRoutineAddress;
    writableBytes[i++] = Instruction.PUSH_LIT;
    writableBytes[i++] = 0x01; // 0x0102
    writableBytes[i++] = 0x02;

    writableBytes[i++] = Instruction.PUSH_LIT;
    writableBytes[i++] = 0x03; // 0x0304
    writableBytes[i++] = 0x04;

    writableBytes[i++] = Instruction.PUSH_LIT;
    writableBytes[i++] = 0x05; // 0x0506
    writableBytes[i++] = 0x06;

    writableBytes[i++] = Instruction.MOV_LIT_REG;
    writableBytes[i++] = 0x07; // 0x0708
    writableBytes[i++] = 0x08;
    writableBytes[i++] = cpu.REGISTER1;

    writableBytes[i++] = Instruction.MOV_LIT_REG;
    writableBytes[i++] = 0x09; // 0x090A
    writableBytes[i++] = 0x0a;
    writableBytes[i++] = cpu.REGISTER8;

    writableBytes[i++] = Instruction.RET;

    cpu.stepXTimes(12);
    expect(cpu.peekRegister(Register.REGISTER1)).toEqual(0x0708);
    expect(cpu.peekRegister(Register.REGISTER8)).toEqual(0x090a);

    cpu.stepXTimes(5);

    expect(cpu.peekRegister(Register.REGISTER1)).toEqual(0x1234);
    expect(cpu.peekRegister(Register.REGISTER4)).toEqual(0x5678);
    expect(cpu.peekRegister(Register.REGISTER8)).toEqual(0x0000);
    expect(cpu.viewStack()).toEqual(
      "0xfff6: 0x12 0x34 0x44 0x44 0x33 0x33 0x22 0x22 0x11 0x11"
    );
  });
});
