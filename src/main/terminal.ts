import { Console } from "console";
import { Abortable } from "events";
import * as ReadLine from "readline/promises";

export class Terminal extends Console {
  public constructor(
    public readonly terminal: ReadLine.Interface = ReadLine.createInterface({
      input: process.stdin,
      output: process.stdout
    })
  ) {
    super(process.stdout);
  }

  public print(...data: any[]) {
    console.log(...data);
  }

  public ask(query: string, options?: Abortable) {
    return options 
      ? this.terminal.question(query, options)
      : this.terminal.question(query);
  };

  public close() {
    return this.terminal.close();
  };
}

export default Terminal;
