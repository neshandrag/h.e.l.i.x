const app = require('./app');
const env = require('./config/env');
const { scheduleDecayJob } = require('./jobs/decayJob');
const { launchTelegramBot } = require('./services/telegram.service');

app.listen(env.PORT, () => {
  console.log(`Helix API listening on port ${env.PORT} (${env.NODE_ENV})`);
  scheduleDecayJob();
  launchTelegramBot();
});
