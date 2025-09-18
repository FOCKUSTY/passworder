import {
  LATEST_PASSWORD_FILE,
  PROGRAM_NAME,
  PASSWORDER_RESPONSE,
  VERSION_FILE_PATH,
  PASSWORDER_METHODS,
  formatRussianWords,
  AVAILABLE_METHODS,
  AVAILABLE_METHODS_DESCRIPTION,
  AVAILABLE_METHODS_INDEX_OFFSET,
  REPOSITORY_URL,
} from "../constants";

import { readFileSync } from "fs";

import Terminal from "./terminal";
import Passworder, { type WatchServiceResponse } from "./passworder";

type Methods = Record<
  (typeof AVAILABLE_METHODS)[number],
  () => Promise<void> | void
>;

const JOIN = "\n";
const LIST_PREFIX = JOIN + " — ";

class User implements Methods {
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
    terminal: Terminal;
    login: string;
    key: string;
  }) {
    this.terminal = terminal;
    this.passworder = new Passworder(login);
    this.login = login;
    this.key = key;

    this.terminal.clearCooldown = this.passworder.cooldown;
  }

  public async execute(): Promise<void> {
    await this.passworder.init();
    await this.passworder.writeGlobalKey(this.key);

    this.terminal.print("Мы сохранили Ваши данные");

    return this.chooseMethod();
  }

  public async chooseMethod() {
    const methods = AVAILABLE_METHODS.map(
      (method, index) =>
        `${method} (${+index + AVAILABLE_METHODS_INDEX_OFFSET}) — ${AVAILABLE_METHODS_DESCRIPTION[method]}`,
    ).join(LIST_PREFIX);

    this.terminal.print(
      "Выберите подходящий для Вас метод:" + LIST_PREFIX + methods,
    );

    const inputedMethod = await this.terminal.ask("");
    const method = this.validateMethod(inputedMethod);
    if (!method) {
      this.terminal.print("Мы не нашли подходящего метода, попробуйте снова");
      this.chooseMethod();
      return;
    }

    return await this[method]();
  }

  public async list() {
    const services = this.passworder.list();

    if (services.length === 0) {
      this.terminal.print("Мы не смогли найти никаких сервисов...");
      this.chooseMethod();
      return;
    }

    this.terminal.print("Вот все сервисы с установленным паролем:");
    this.terminal.print(services.join(JOIN));

    this.chooseMethod();
  }

  public async watch() {
    this.currentService = await this.terminal.ask(
      "Какой сервис Вы хотите посмотреть? ",
    );
    const response = await this.passworder.watchService(this.currentService);

    this[PASSWORDER_METHODS[response.type]](response);
  }

  public async change() {
    this.currentService = await this.terminal.ask(
      "Какой сервис хотите изменить? ",
    );
    const password = await this.terminal.ask("Введите пароль: ");

    this.changePassword({
      successed: true,
      type: "PASSWORD OVERRIDE",
      password,
    });
  }

  public async delete() {
    this.currentService = await this.terminal.ask(
      "Какой сервис хотите удалить? ",
    );

    const successed = await this.passworder.deleteService(this.currentService);

    this.terminal.print(
      successed
        ? "Удалось удалить сервис"
        : "Не удалось удалить сервис, хотите сообщить об этом разработчику?" +
            `${REPOSITORY_URL}/issues`,
    );

    this.next();
  }

  public async "change-cooldown"(isRetry: boolean = false) {
    if (!isRetry) {
      this.terminal.print("Задержка должна быть число, от 2 до 20 секунд");
    }

    const cooldown = await this.terminal.ask(
      "Какую задержку вы хотите поставить? ",
    );
    const newCooldown = +cooldown;
    const successed = this.passworder.changeCooldown(newCooldown);

    if (successed !== true) {
      this.terminal.print(successed.message);
      this["change-cooldown"](true);
      return;
    }

    this.terminal.clearCooldown = newCooldown;
    this.terminal.print(
      "Отлично, теперь новая задержка: " +
        newCooldown +
        " " +
        formatRussianWords(newCooldown, ["секунда", "секунды", "секунд"]),
    );

    this.next();
  }

  public async getPassword(response: WatchServiceResponse) {
    if (response.type !== PASSWORDER_RESPONSE.PASSWORD_GET) {
      throw new Error("Can not execute invalid type.");
    }

    if (!response.successed) {
      return this.badPassword(response.getPassword);
    }

    this.terminal.print("Удалось получится пароль, ура!");
    this.terminal.print("Держите его, и никому не показывайте!");

    return this.executePassword(response.password);
  }

  public async createPassword(response: WatchServiceResponse) {
    if (response.type !== PASSWORDER_RESPONSE.PASSWORD_CREATE) {
      throw new Error("Can not execute invalid type.");
    }

    if (response.successed) {
      this.terminal.print("Вы успешно создали пароль!");
      return this.next();
    }

    this.terminal.print("У этого сервиса нет установленного пароля");
    const authGeneratePassword = await this.terminal.question(
      "Сгенерировать пароль автоматически? (Y/N) ",
    );

    if (authGeneratePassword) {
      const password = await response.createPassword(true);
      return this.executePassword(password);
    }

    const password = await this.terminal.ask("Ну тогда вводите пароли сами: ");

    this.passworder.addService(this.currentService, password);
    await this.savePassword(password);

    return this.next();
  }

  public async changePassword(response: WatchServiceResponse) {
    if (response.type !== PASSWORDER_RESPONSE.PASSWORD_OVERRIDE) {
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
    this.terminal.print(
      "Мы сохранили этот пароль, как последний в " + LATEST_PASSWORD_FILE,
    );
    return Passworder.writePassword(password);
  }

  protected async badPassword(
    getPassword: (key: string) => string | false,
  ): Promise<void> {
    this.terminal.print("Не удалось получить пароль... :(");
    this.terminal.print("Возможно, там используется другой ключ шифрования...");

    const next = await this.terminal.question(
      "Быть может, Вы ошиблись буквой? Хотите попробовать ещё раз? (Y/N) ",
    );

    if (!next) {
      return this.next();
    }

    const isGlobal = await this.terminal.question(
      "Там точно используется глобавльный ключ шифрования? (Y/N) ",
    );

    if (isGlobal) {
      return this.next();
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
    const showPassword = await this.terminal.question(
      "Показать пароль? (Y/N) ",
    );

    if (showPassword) {
      this.terminal.print("Держите Ваш пароль: " + password);

      this.terminal.print("Надеемся, что Вы успели скопировать пароль!");
    } else {
      this.terminal.print("Нет? За Вами кто-то наблюдает?");
      this.terminal.print(
        "Вы сможете посмотреть пароль, когда за Вами никто небудет смотреть!",
      );
    }

    await this.savePassword(password);

    return this.next();
  }

  protected async next() {
    const next = await this.terminal.question("Продолжить? (Y/N) ");

    return next ? this.chooseMethod() : this.exit();
  }

  protected clear() {
    const seconds = Math.floor(this.terminal.props.clearCooldown / 1000);

    this.terminal.print(
      `Мы очистим консоль через ${seconds} ${formatRussianWords(seconds, ["секунду", "секунды", "секунд"])}`,
    );

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.terminal.clear());
      }, this.terminal.props.clearCooldown);
    });
  }

  private validateMethod(
    method: string,
  ): (typeof AVAILABLE_METHODS)[number] | false {
    if ((AVAILABLE_METHODS as readonly string[]).includes(method)) {
      return method as (typeof AVAILABLE_METHODS)[number];
    }

    if (Number.isNaN(+method)) {
      return false;
    }

    return AVAILABLE_METHODS[+method - AVAILABLE_METHODS_INDEX_OFFSET] ?? false;
  }
}

export class Program {
  public constructor(public readonly terminal: Terminal = new Terminal()) {}

  public async execute(): Promise<User> {
    this.terminal.print(
      `Привет, пользователь, Вас приветствует ${PROGRAM_NAME} версии ${readFileSync(VERSION_FILE_PATH, "utf-8")}!`,
    );
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
