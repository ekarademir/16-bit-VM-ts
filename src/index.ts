import { CPU, Instruction, Register } from "./cpu";
import { createMemory } from "./memory";
import readline from "readline";

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

cpu.debug();
console.log(cpu.viewMemoryAt(cpu.instructionPointer));
console.log(cpu.viewStack());

rl.on("line", (input) => {
  if (input === "q") {
    rl.close();
    return;
  }
  cpu.step();
  cpu.debug();
  console.log(cpu.viewMemoryAt(cpu.instructionPointer));
  console.log(cpu.viewStack());
});
