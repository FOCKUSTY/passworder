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

  public print(...data: Parameters<typeof Main.execute>) {
    return Main.execute(...data);
  }

  public async read(...data: Parameters<typeof Main.read>): Promise<string> {
    const input = await Main.read(data[0], {
      end: " ",
      ...data[1]
    });

    if (input instanceof Error) {
      throw input;
    }

    return input;
  }

  public async question(query: string): Promise<boolean> {
    const answer = await this.read(query, { end: " " });

    return YES_ANSWERS.includes(answer);
  }

  public async ask(...data: Parameters<typeof Main.readRaw>): Promise<string> {
    const input = await Main.readRaw(...data);

    if (input instanceof Error) {
      throw input;
    }

    return input;
  }

  public set clearCooldown(cooldown: number) {
    if (cooldown > 20) {
      throw new Error("Задержка не может быть больше 20 секунд");
    }

    this.props.clearCooldown = cooldown * 1000;
  }
}

export default Terminal;
