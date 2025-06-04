// ТОЛЬКО БИЗНЕС-ЛОГИКА SOAP СЕРВИСА
// Структура должна соответствовать WSDL файлу

const helloService = {
  // Название сервиса из WSDL: <service name="HelloService">
  HelloService: {
    // Название порта из WSDL: <port name="HelloPort">
    HelloPort: {
      
      // Операция из WSDL: <operation name="SayHello">
      SayHello: function(args, callback) {
        console.log('📨 SOAP вызов SayHello с параметрами:', args);
        
        try {
          // args содержит параметры из SOAP запроса
          const name = args.name || 'Гость';
          
          // Формируем ответ (должен соответствовать WSDL response)
          const response = {
            greeting: `Привет, ${name}! Это SOAP сервис.`
          };
          
          console.log('📤 Отправляем ответ:', response);
          
          // Успешный ответ: callback(null, result)
          callback(null, response);
          
        } catch (error) {
          console.error('❌ Ошибка в SayHello:', error);
          
          // SOAP Fault при ошибке
          callback({
            Fault: {
              faultcode: 'Server',
              faultstring: 'Внутренняя ошибка сервера: ' + error.message
            }
          });
        }
      }
    }
  }
};

module.exports = {
  helloService
};