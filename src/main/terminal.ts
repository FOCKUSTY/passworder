import { Console } from "console";
import { Abortable } from "events";
import * as ReadLine from "readline/promises";

type Props = Partial<{
  clearCooldown: number
}>;

export class Terminal extends Console {
  public static readonly props: Required<Props> = {
    clearCooldown: 5 * 1000
  }

  public readonly props: Required<Props>;

  public constructor(
    public readonly terminal: ReadLine.Interface = ReadLine.createInterface({
      input: process.stdin,
      output: process.stdout
    }),
    props?: Props
  ) {
    super(process.stdout);
    
    this.props = {
      ...props,
      ...Terminal.props
    }
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
