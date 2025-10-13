import { Console } from "console";

import { YES_ANSWERS } from "../constants";
import { Loggers } from "../logger";

const { Main } = new Loggers();

type Props = Partial<{
  clearCooldown: number;
}>;

export class Terminal extends Console {
  public static readonly props: Required<Props> = {
    clearCooldown: 5 * 1000,
  };

  public readonly props: Required<Props>;

  public constructor(props?: Props) {
    super(process.stdout);

    this.props = {
      ...props,
      ...Terminal.props,
    };
  }

  public print<T>(...data: T[]): T[] {
    Main.execute(data);
    return data;
  }

  public async read(...data: Parameters<typeof Main.read>): Promise<string> {
    const input = await Main.read(...data);

    if (input instanceof Error) {
      throw input;
    }

    return input;
  }
  
  public async question(query: string): Promise<boolean> {
    const answer = await this.read(query, { end: "" });

    return YES_ANSWERS.includes(answer);
  }

  public async ask(query: string, hide: boolean = false): Promise<string> {
    const data = hide
      ? await Main.readRaw(query, { end: "", hideInput: true })
      : await Main.read(query, { end: "" });

    if (data instanceof Error) {
      throw data;
    }

    return data;
  }

  public set clearCooldown(cooldown: number) {
    if (cooldown > 20) {
      throw new Error("Задержка не может быть больше 20 секунд");
    }

    this.props.clearCooldown = cooldown * 1000;
  }
}

export default Terminal;
