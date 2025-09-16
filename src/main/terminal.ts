import { Console } from "console";
import { Abortable } from "events";
import * as ReadLine from "readline/promises";

import { YES_ANSWERS } from "../constants";

type Props = Partial<{
  clearCooldown: number;
}>;

export class Terminal extends Console {
  public static readonly props: Required<Props> = {
    clearCooldown: 5 * 1000,
  };

  public readonly props: Required<Props>;

  public constructor(
    public readonly terminal: ReadLine.Interface = ReadLine.createInterface({
      input: process.stdin,
      output: process.stdout,
    }),
    props?: Props,
  ) {
    super(process.stdout);

    this.props = {
      ...props,
      ...Terminal.props,
    };
  }

  public print<T>(...data: T[]): T[] {
    console.log(...data);
    return data;
  }

  public async question(query: string, options?: Abortable): Promise<boolean> {
    const answer = await this.ask(query, options);
    return YES_ANSWERS.includes(answer);
  }

  public ask(query: string, options?: Abortable): Promise<string> {
    return options
      ? this.terminal.question(query, options)
      : this.terminal.question(query);
  }

  public close(): void {
    return this.terminal.close();
  }
}

export default Terminal;
