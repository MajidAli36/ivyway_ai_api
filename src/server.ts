import { app } from './app';
import { env } from './config/env';
import { startSchedulers } from './schedulers';

const PORT = env.PORT;

// Start schedulers
startSchedulers();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${env.NODE_ENV}`);
  console.log(`🤖 AI Provider: ${env.LLM_PROVIDER}`);
});

