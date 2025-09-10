import {
  LATEST_PASSWORD_FILE,
  PROGRAM_NAME,
  TYPES,
  VERSION_FILE_PATH,
  PASSWORD_TYPES,
  formatRussianWords
} from "./constants";

import { readFileSync } from "fs";

import Terminal from "./terminal";
import Passworder, { type WatchServiceResponse } from "./passworder";

class User {
  public readonly terminal: Terminal;
  public readonly passworder: Passworder;
  public readonly login: string;
  public readonly key: string; 

  public currentService: string = "none";

  public constructor({
    terminal,
    login,
    key,
  }: {
    terminal: Terminal,
    login: string,
    key: string,
  }) {
    this.terminal = terminal;
    this.passworder = new Passworder(login);
    this.login = login;
    this.key = key;
  }

  public async execute(): Promise<unknown> {
    await this.passworder.init();
    await this.passworder.writeGlobalKey(this.key);

    this.terminal.print("Мы сохранили Ваши данные");

    return this.ask();
  }

  public async ask() {
    const service = await this.terminal.ask("Какой сервис Вы хотите посмотреть? ");
    const response = await this.passworder.watchService(service);

    this.currentService = service;

    this[PASSWORD_TYPES[response.type]](response);
  }

  public async get(response: WatchServiceResponse) {
    if (response.type !== TYPES.PASSWORD_GET) {
      throw new Error("Can not execute invalid type.");
    }

    if (!response.successed) {
      return this.badPassword(response.getPassword);
    }

    this.terminal.print("Удалось получится пароль, ура!");
    this.terminal.print("Держите его, и никому не показывайте!");

    return this.executePassword(response.password);
  }

  public async create(response: WatchServiceResponse) {
    if (response.type !== TYPES.PASSWORD_CREATE) {
      throw new Error("Can not execute invalid type.");
    }

    if (response.successed) {
      this.terminal.print("Вы успешно создали пароль!");
      return this.next();
    }

    this.terminal.print("У этого сервиса нет установленного пароля");
    const authGeneratePassword = await this.terminal.question("Сгенерировать пароль автоматически? (Y/N) ");
    
    if (authGeneratePassword) {
      const password = await response.createPassword(true);
      return this.executePassword(password);
    }

    const password = await this.terminal.ask("Ну тогда вводите пароли сами: ");
    
    this.passworder.addService(this.currentService, password);
    await this.savePassword(password);

    return this.next();
  }

  public async change(response: WatchServiceResponse) {
    if (response.type !== TYPES.PASSWORD_OVERRIDE) {
      throw new Error("Can not execute invalid type.");
    }

    if (!response.successed) {
      return this.next();
    }

    await this.savePassword(response.password);
    
    return this.next();
  }

  public exit(): void {
    this.terminal.print("Спасибо, что используете " + PROGRAM_NAME);
    this.terminal.print("Пока-пока!");

    return process.exit();
  }

  protected async savePassword(password: string) {
    await this.clear();
    this.terminal.print("Мы сохранили этот пароль, как последний в " + LATEST_PASSWORD_FILE);
    return Passworder.writePassword(password);
  }

  protected async badPassword(getPassword: (key: string) => string | false): Promise<void> {
    this.terminal.print("Не удалось получить пароль... :(");
    this.terminal.print("Возможно, там используется другой ключ шифрования...");

    const next = await this.terminal.question("Быть может, Вы ошиблись буквой? Хотите попробовать ещё раз? (Y/N) ");
    
    if (!next) {
      return this.ask();
    }

    const isGlobal = await this.terminal.question("Там точно используется глобавльный ключ шифрования? (Y/N) ");
    
    if (isGlobal) {
      return this.ask();
    }

    const key = await this.terminal.ask("Введите другой ключ шифрования: ");
    const password = getPassword(key);

    if (password) {
      return this.executePassword(password);
    }

    this.badPassword(getPassword);
    
    return;
  }

  protected async executePassword(password: string) {
    const showPassword = await this.terminal.question("Показать пароль? (Y/N) ");
    
    if (showPassword) {
      this.terminal.print("Держите Ваш пароль: " + password);

      this.terminal.print("Надеемся, что Вы успели скопировать пароль!");
    } else {
      this.terminal.print("Нет? За Вами кто-то наблюдает?");
      this.terminal.print("Вы сможете посмотреть пароль, когда за Вами никто небудет смотреть!");
    }

    await this.savePassword(password);

    return this.next();
  }

  protected async next() {
    const next = await this.terminal.question("Продолжить? (Y/N) ");
    
    return next
      ? this.ask()
      : this.exit();
  }

  protected clear() {
    const seconds = Math.floor(this.terminal.props.clearCooldown / 1000);
    
    this.terminal.print(`Мы очистим консоль через ${seconds} ${formatRussianWords(seconds, ["секунду", "секунды", "секунд"])}`);

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.terminal.clear());
      }, this.terminal.props.clearCooldown);
    });
  }
}

export class Program {
  public constructor(
    public readonly terminal: Terminal = new Terminal()
  ) {}

  public async execute(): Promise<User> {
    this.terminal.print(`Привет, пользователь, Вас приветствует ${PROGRAM_NAME} версии ${readFileSync(VERSION_FILE_PATH, "utf-8")}!`);
    this.terminal.print("Что ж, не будем медлить!");

    const login = await this.terminal.ask("Введите логин: ");
    const key = await this.terminal.ask("Введите ключ шифрования: ");

    this.terminal.clear();

    return new User({ terminal: this.terminal, login, key });
  }
}

(async () => {
  const user = await new Program().execute();
  
  await user.execute();
})();
