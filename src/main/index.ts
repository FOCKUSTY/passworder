import {
  LATEST_PASSWORD_FILE,
  PROGRAM_NAME,
  TYPES,
  VERSION_FILE_PATH
} from "./constants";

import { readFileSync } from "fs";

import Terminal from "./terminal";
import Passworder from "./passworder";

const terminal = new Terminal();

terminal.print(`Привет, пользователь, Вас приветствует ${PROGRAM_NAME} версии ${readFileSync(VERSION_FILE_PATH, "utf-8")}!`);
terminal.print("Что ж, не будем медлить!");

class User {
  public readonly terminal: Terminal;
  public readonly passworder: Passworder;
  public readonly login: string;
  public readonly key: string; 

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

    await this.clear();
    this.terminal.print("Мы сохранили Ваши данные");

    return;
  }

  protected clear() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(terminal.clear());
      }, terminal.props.clearCooldown);
    });
  }
}

export class Program {
  public constructor(
    public readonly terminal: Terminal = new Terminal()
  ) {}

  public async execute(): Promise<User> {
    const login = await terminal.ask("Введите логин: ");
    const key = await terminal.ask("Введите ключ шифрования: ");

    return new User({ terminal: this.terminal, login, key });
  }
}

(async () => {
  const login = await terminal.ask("Введите логин: ");
  
  const passworder = await new Passworder(login).init();

  const key = await terminal.ask("Введите ключ шифрования: ");
  
  passworder.writeGlobalKey(key);

  terminal.clear();
  terminal.print("Мы сохранили Ваши данные");
  
  const clearTerminal = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(terminal.clear());
      }, 5 * 1000);
    });
  }

  const showPassword = async (data: string, password: string, askService: (end?: boolean) => Promise<unknown>) => {
    if (data.toLowerCase() === "y") {
      terminal.print("Держите Ваш пароль: " + password);
      terminal.print("Мы очистим терминал через 5 секунд, копируйте быстрее!");

      await clearTerminal();

      terminal.print("Надеемся, что Вы успели скопировать пароль!");
      terminal.print("Если это не так, то Вы можете посмотреть его в " + LATEST_PASSWORD_FILE);

      await Passworder.writePassword(password);

      const nextAttempt = await terminal.ask("Хотите посмотреть пароль ещё одного сервиса? (Y/N) ");

      if (nextAttempt.toLowerCase() === "y") return askService();
      else return askService(false);
    } else {
      terminal.print("Нет? За Вами кто-то наблюдает?");
      terminal.print(`Тогда мы сохраним пароль в файле ${LATEST_PASSWORD_FILE}!`);
      terminal.print("Вы сможете посмотреть его, когда за Вами никто небудет смотреть!");

      await Passworder.writePassword(password);

      return askService(false);
    }
  }

  const askService = async (end?: boolean) => {
    if (end === false) { 
      terminal.print("Спасибо, что используете " + PROGRAM_NAME);
      terminal.print("Пока-пока!");
      return terminal.close();
    }

    const service = await terminal.ask("Какой сервис Вы хотите посмотреть? ");
    const response = await passworder.watchService(service);
    
    if (response.type === TYPES.PASSWORD_GET) {
      if (response.successed) {
        terminal.print("Удалось получится пароль, ура!");
        terminal.print("Держите его, и никому не показывайте!");

        const isPasswordShow = await terminal.ask("Показать пароль? (Y/N) ");

        return showPassword(isPasswordShow, response.password, askService);
      } else {
        terminal.print("Не удалось получить пароль... :(");
        terminal.print("Возможно, там используется другой ключ шифрования...");
        const nextAttempt = await terminal.ask("Быть может, Вы ошиблись буквой? Хотите попробовать ещё раз? (Y/N) ");
        
        if (nextAttempt.toLowerCase() === "y") {
          const isGlobal = await terminal.ask("Там точно используется глобавльный ключ шифрования? (Y/N) ")
          
          if (isGlobal.toLowerCase() === "y") {
            return askService();
          } else {
            const key = await terminal.ask("Тогда введите другой ключ: ");
            
            const data = response.execute(key);

            if (!data) {
              terminal.print("И всё же не получилось... эх :(");
              return askService();
            }
            
            const isPasswordShow = await terminal.ask("Пароль у нас, вывести? (Y/N) ");
            return showPassword(data, isPasswordShow, askService);
          }
        }
        else return askService(false);
      }
    } else if (response.type === TYPES.PASSWORD_CREATE) {
      if (response.successed) {
        terminal.print("Вы успешно создали пароль!");
        terminal.print("Мы сохранил его в файле " + LATEST_PASSWORD_FILE);
        
        const next = await terminal.ask("Хотите что-нибудь ещё? (Y/N) ");

        if (next.toLowerCase() === "y") return askService();
        else return askService(false);
      } else {
        terminal.print("У этого сервиса нет установленного пароля")
        const autoGenerateEnabled = await terminal.ask("Хотите автоматически сгенерировать пароль для этого сервиса? (Y/N) ");
        
        if (autoGenerateEnabled.toLowerCase() === "y") {
          const pass = await response.execute(true);
          const isPasswordShow = await terminal.ask("Отлично! Мы создали для Вас пароль, показать его? (Y/N) ");
  
          return showPassword(isPasswordShow, pass, askService);
        } else {
          const pass = await terminal.ask("Ну нет, так нет, тогда сами вводите пароль: ");
          
          passworder.addService(service, pass);
          Passworder.writePassword(pass);
          
          terminal.print("Мы очистим терминал через 5 секунд, чтобы никто не увидел Ваш пароль");

          await clearTerminal();

          terminal.print("Мы сохранили Ваш пароль в файле " + LATEST_PASSWORD_FILE);

          const next = await terminal.ask("Хотите что-нибудь ещё? (Y/N) ");

          if (next.toLowerCase() === "y") return askService();
          else return askService(false);
        }
      }
    } else if (response.type === TYPES.PASSWORD_OVERRIDE) {
      if (response.successed) {
        Passworder.writePassword(response.password);

        const next = await terminal.ask("Вы успешно сменили пароль, хотите посмотреть что-нибудь ещё? (Y/N) ");
        
        terminal.print("Также мы сохранили Ваш пароль в файле " + LATEST_PASSWORD_FILE);

        if (next.toLowerCase() === "y") return askService();
        else return askService(false);
      } else {
        const next = await terminal.ask("Интересно... хотите попробовать ещё раз? (Y/N)");
        
        if (next.toLowerCase() === "y") return askService();
        else return askService(false);
      }
    } else {
      throw new Error("UNKNOWN ERROR");
    }
  }

  await askService();
})();