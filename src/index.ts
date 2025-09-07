import { PROGRAM_NAME } from "./constants";

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
  
  terminal.print("На этом наша программа пока что всё. Приходите позже и увидите новые обновления!")

  // const service = terminal.ask("Какой сервис Вы хотите посмотреть? ");
})();