const { withGradleProperties } = require("@expo/config-plugins");

module.exports = function withKotlinFix(config) {
  return withGradleProperties(config, (config) => {
    // Filtramos para evitar que se duplique si compilas varias veces
    config.modResults = config.modResults.filter(
      (item) => item.key !== "kotlin.jvm.target.validation.mode",
    );
    // Añadimos nuestro silenciador
    config.modResults.push({
      type: "property",
      key: "kotlin.jvm.target.validation.mode",
      value: "IGNORE",
    });
    return config;
  });
};
