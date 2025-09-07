import { LATEST_PASSWORD_FILE, PROGRAM_NAME, TYPES } from "./constants";

import Terminal from "./terminal";
import Passworder from "./passworder";

const terminal = new Terminal();

terminal.print(`Привет, пользователь, Вас приветствует ${PROGRAM_NAME}!`);
terminal.print("Что ж, не будем медлить!");

const checkFileStatus = (passworder: Passworder) => {
  terminal.print("Проверяем статус файла...");
  return passworder.getFileStatus();
}

(async () => {
  const login = await terminal.ask("Введите логин: ");
  
  const passworder = new Passworder(login);
  
  terminal.print("Статус файла: " + await checkFileStatus(passworder));
  
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
        const nextAttempt = await terminal.ask("Быть может, Вы ошиблись буквой? Хотите попробовать ещё раз? (Y/N) ");
        
        if (nextAttempt.toLowerCase() === "y") return askService();
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