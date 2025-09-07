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

        const showPassword = await terminal.ask("Показать пароль? (Y/N) ");
        
        if (showPassword === "Y") {
          terminal.print("Держите Ваш пароль: " + response.password);
          terminal.print("Мы очистим терминал через 5 секунд, копируйте быстрее!");

          await new Promise((resolve) => {
            setTimeout(() => {
              resolve(terminal.clear());
            }, 5 * 1000);
          });

          terminal.print("Надеемся, что Вы успели скопировать пароль!");
          terminal.print("Если это не так, то Вы можете посмотреть его в " + LATEST_PASSWORD_FILE);

          await Passworder.writePassword(response.password);

          const nextAttempt = await terminal.ask("Хотите посмотреть пароль ещё одного сервиса? (Y/N) ");
          
          if (nextAttempt === "Y") askService();
          else askService(false);
        } else {
          terminal.print("Нет? За Вами кто-то наблюдает?");
          terminal.print(`Тогда мы сохраним пароль в файле ${LATEST_PASSWORD_FILE}!`);
          terminal.print("Вы сможете посмотреть его, когда за Вами никто небудет смотреть!");

          await Passworder.writePassword(response.password);

          return askService(false);
        }
      } else {
        terminal.print("Не удалось получить пароль... :(");
        const nextAttempt = await terminal.ask("Быть может, Вы ошиблись буквой? Хотите попробовать ещё раз? (Y/N) ");
        
        if (nextAttempt === "Y") askService();
        else askService(false);
      }
    } else if (response.type === TYPES.PASSWORD_CREATE) {
      if (response.successed) {
        
      } else {
  
      }
    } else if (response.type === TYPES.PASSWORD_OVERRIDE) {
      if (response.successed) {
  
      } else {
  
      }
    } else {
  
    }
  }

  askService();
})();