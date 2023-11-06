import { CPU, Instruction, Register } from "./cpu";
import { createMemory } from "./memory";
import readline from "readline";

const memory = createMemory(256 * 256);
const writableBytes = new Uint8Array(memory.buffer);

const cpu = new CPU(memory);

let i = 0;

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

cpu.debug();
console.log(cpu.viewMemoryAt(cpu.instructionPointer));
console.log(cpu.viewMemoryAt(0x0100));

rl.on("line", (input) => {
  if (input === "q") {
    rl.close();
    return;
  }
  cpu.step();
  cpu.debug();
  console.log(cpu.viewMemoryAt(cpu.instructionPointer));
  console.log(cpu.viewMemoryAt(0x0100));
});
